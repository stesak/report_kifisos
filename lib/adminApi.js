import { createClient } from "@supabase/supabase-js";

const allowedRoles = new Set(["operator", "admin"]);
const windowMs = 60 * 1000;
const maxRequests = 30;
const rateLimitStore = globalThis.__adminRateLimitStore || new Map();
globalThis.__adminRateLimitStore = rateLimitStore;

export function publicError(error) {
  if (error.message.includes("rate limit")) {
    return { status: 429, message: "Too many admin requests. Please try again shortly." };
  }

  if (error.message.includes("environment")) {
    return { status: 500, message: "Admin service is not configured" };
  }

  if (error.message.includes("authorization")) {
    return { status: 401, message: "Unauthorized" };
  }

  if (error.message.includes("last active admin")) {
    return { status: 400, message: "Cannot remove access from the last active admin." };
  }

  return { status: 500, message: "Admin request failed" };
}

export function isValidRole(role) {
  return allowedRoles.has(role);
}

export function applyRateLimit(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const forwardedFor = req.headers["x-forwarded-for"]?.split(",")[0]?.trim();
  const key = token || forwardedFor || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  current.count += 1;
  if (current.count > maxRequests) {
    throw new Error("rate limit exceeded");
  }
}

export function getSupabaseClients(req) {
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

export async function requireAdmin(req) {
  applyRateLimit(req);

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

  return { adminClient, actingUserId: userData.user.id };
}

export async function assertNotLastActiveAdmin(adminClient, targetUserId, patch) {
  const removesAdminRole = patch.role && patch.role !== "admin";
  const disablesUser = patch.is_authorized === false;

  if (!removesAdminRole && !disablesUser) return;

  const { data: targetProfile, error: targetError } = await adminClient
    .from("profiles")
    .select("role,is_authorized")
    .eq("id", targetUserId)
    .single();

  if (targetError) throw targetError;
  if (targetProfile?.role !== "admin" || !targetProfile?.is_authorized) return;

  const { count, error: countError } = await adminClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("is_authorized", true);

  if (countError) throw countError;
  if ((count || 0) <= 1) {
    throw new Error("last active admin cannot be modified");
  }
}
