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

async function listUsers(adminClient) {
  const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (authError) throw authError;

  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id,email,role,is_authorized,created_at");

  if (profilesError) throw profilesError;

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));

  return (authData.users || []).map((user) => {
    const profile = profileById.get(user.id);
    return {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
      created_at: user.created_at,
      role: profile?.role || "operator",
      is_authorized: Boolean(profile?.is_authorized),
    };
  });
}

export default async function handler(req, res) {
  try {
    const adminCheck = await requireAdmin(req);
    if (adminCheck.error) {
      return res.status(adminCheck.status).json({ error: adminCheck.error });
    }

    const { adminClient } = adminCheck;

    if (req.method === "GET") {
      const users = await listUsers(adminClient);
      return res.status(200).json({ users });
    }

    if (req.method === "POST") {
      const { email, password, role = "operator", is_authorized = true } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      if (!allowedRoles.has(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      if (typeof is_authorized !== "boolean") {
        return res.status(400).json({ error: "Invalid authorization value" });
      }

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error) throw error;

      const { error: profileError } = await adminClient.from("profiles").upsert({
        id: data.user.id,
        email,
        role,
        is_authorized,
      });

      if (profileError) throw profileError;

      const users = await listUsers(adminClient);
      return res.status(201).json({ users });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Admin users API error:", error);
    const response = publicError(error);
    return res.status(response.status).json({ error: response.message });
  }
}
