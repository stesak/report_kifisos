import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Activity, Building2, FilePlus2, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { clearUser, setUser } from "../store/authSlice";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const GOV_GR_LOGO =
  "https://guide.services.gov.gr/assets/files/govgr-logo-fa78bc13be038eeb3bf10456fd8ece3b.svg";

export default function Layout({ children }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      dispatch(setUser({ email: "demo@kifisos.local" }));
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      dispatch(setUser(data.user));
      if (!data.user && router.pathname === "/dashboard") {
        router.replace("/login");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setUser(session?.user || null));
    });

    return () => subscription.unsubscribe();
  }, [dispatch, router]);

  async function handleLogout() {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    dispatch(clearUser());
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-govgray">
      <header className="bg-govblue text-white">
        <div className="mx-auto flex min-h-[75px] max-w-7xl flex-col justify-center gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-0">
          <Link href="/" className="flex min-w-0 items-center gap-4">
            <img
              src={GOV_GR_LOGO}
              alt="gov.gr"
              className="h-10 w-auto shrink-0 sm:h-[50px]"
            />
            <span className="hidden h-10 w-px bg-white/30 sm:block" />
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/40 text-white">
                <Building2 size={21} />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase leading-tight tracking-normal text-white/75">
                  Ελληνική Δημοκρατία
                </span>
                <span className="block text-sm font-bold leading-tight text-white sm:text-base">
                  Υπουργείο Υποδομών και Μεταφορών
                </span>
              </span>
            </span>
          </Link>

          <nav className="flex min-w-0 flex-wrap items-center justify-between gap-2 lg:justify-end">
            <span className="flex min-w-0 items-center gap-2 border border-white/30 px-3 py-2 text-sm text-white/90">
              <ShieldCheck size={16} />
              <span className="truncate">{loading ? "Έλεγχος..." : user?.email || "Χωρίς σύνδεση"}</span>
            </span>
            {user ? (
              <>
                <Link
                  href="/"
                  className="inline-flex h-10 shrink-0 items-center gap-2 border border-white/30 px-3 text-sm font-bold text-white hover:bg-white/10"
                >
                  <FilePlus2 size={16} />
                  Καταχώρηση
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex h-10 shrink-0 items-center gap-2 border border-white/30 px-3 text-sm font-bold text-white hover:bg-white/10"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-white/30 bg-white text-govblue hover:bg-govgray"
                  aria-label="Αποσύνδεση"
                  title="Αποσύνδεση"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-10 shrink-0 items-center gap-2 bg-white px-3 text-sm font-bold text-govblue hover:bg-govgray"
              >
                <Activity size={16} />
                Σύνδεση
              </Link>
            )}
          </nav>
        </div>
        <div className="h-2 bg-govcyan" />
      </header>
      <main>{children}</main>
    </div>
  );
}
