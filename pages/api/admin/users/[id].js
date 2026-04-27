import { createClient } from "@supabase/supabase-js";

const allowedRoles = new Set(["operator", "admin"]);

function publicError(error) {
  if (error.message.includes("environment")) {
    return { status: 500, message: "Admin service is not configured" };
  }

  if (error.message.includes("authorization")) {
    return { status: 401, message: "Unauthorized" };
  }

  return { status: 500, message: "Admin request failed" };
}

function getSupabaseClients(req) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    throw new Error("Supabase admin environment is not configured");
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    throw new Error("Missing authorization token");
  }

  return {
    token,
    userClient: createClient(url, anonKey),
    adminClient: createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }),
  };
}

async function requireAdmin(req) {
  const { token, userClient, adminClient } = getSupabaseClients(req);
  const { data: userData, error: userError } = await userClient.auth.getUser(token);

  if (userError || !userData.user) {
    return { error: "Unauthorized", status: 401 };
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role,is_authorized")
    .eq("id", userData.user.id)
    .single();

  if (profileError || profile?.role !== "admin" || !profile?.is_authorized) {
    return { error: "Admin access required", status: 403 };
  }

  return { adminClient };
}

export default async function handler(req, res) {
  try {
    const adminCheck = await requireAdmin(req);
    if (adminCheck.error) {
      return res.status(adminCheck.status).json({ error: adminCheck.error });
    }

    const { adminClient } = adminCheck;
    const { id } = req.query;

    if (req.method === "PATCH") {
      const { password, role, is_authorized } = req.body || {};

      if (password) {
        if (password.length < 8) {
          return res.status(400).json({ error: "Password must be at least 8 characters" });
        }

        const { error: passwordError } = await adminClient.auth.admin.updateUserById(id, {
          password,
        });
        if (passwordError) throw passwordError;
      }

      if (role || typeof is_authorized === "boolean") {
        const profileUpdate = {};
        if (role) {
          if (!allowedRoles.has(role)) {
            return res.status(400).json({ error: "Invalid role" });
          }
          profileUpdate.role = role;
        }
        if (typeof is_authorized === "boolean") profileUpdate.is_authorized = is_authorized;

        const { error: profileError } = await adminClient
          .from("profiles")
          .update(profileUpdate)
          .eq("id", id);

        if (profileError) throw profileError;
      }

      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Admin user update API error:", error);
    const response = publicError(error);
    return res.status(response.status).json({ error: response.message });
  }
}
