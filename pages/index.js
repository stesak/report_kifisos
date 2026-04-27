import Link from "next/link";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FilePlus2, LockKeyhole, MapPinned, ShieldCheck } from "lucide-react";
import Layout from "../components/Layout";
import IncidentForm from "../components/IncidentForm";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  addIncident,
  incidentTypes,
  setIncidents,
  setIncidentsError,
  setIncidentsLoading,
} from "../store/incidentSlice";

function typeLabel(value) {
  return incidentTypes.find((type) => type.value === value)?.label || value;
}

export default function PublicReport() {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.incidents);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    async function loadIncidents() {
      if (!isSupabaseConfigured || !user) return;

      dispatch(setIncidentsLoading(true));
      const { data, error: fetchError } = await supabase
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (fetchError) {
        dispatch(setIncidentsError(fetchError.message));
        return;
      }

      dispatch(setIncidents(data || []));
    }

    loadIncidents();
  }, [dispatch, user]);

  async function handleCreateIncident(values) {
    const payload = {
      ...values,
      created_by: user?.id || null,
    };

    if (isSupabaseConfigured) {
      const { data, error: insertError } = await supabase
        .from("incidents")
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        dispatch(setIncidentsError(insertError.message));
        return;
      }

      dispatch(addIncident(data));
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `Νέο συμβάν Κηφισού: ${data.title}`,
          message: `${typeLabel(data.type)} στο ${data.latitude}, ${data.longitude}. Διάρκεια: ${data.duration_minutes} λεπτά.`,
        }),
      }).catch(() => {});
      return;
    }

    dispatch(
      addIncident({
        ...payload,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      })
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:py-8">
        <section className="mb-6 border-b border-slate-300 bg-white px-4 py-5 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 border-l-4 border-govcyan bg-govgray px-3 py-2 text-sm font-bold text-govblue">
              <FilePlus2 size={16} />
              Δημόσια καταχώρηση περιστατικού
            </p>
            <h1 className="max-w-3xl text-2xl font-bold tracking-normal text-ink sm:text-3xl">
              Καταχώρηση περιστατικού στον Κηφισό
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
              Η καταχώρηση δημιουργεί ιστορική εγγραφή για ανάλυση σημείων συμφόρησης. Συνδεθείτε για να εμφανιστεί ο χάρτης και η φόρμα.
            </p>
          </div>
          <div className="mt-5 border border-slate-300 bg-govgray p-4 lg:mt-0">
            <div className="mb-3 flex h-10 w-10 items-center justify-center bg-govblue text-white">
              <ShieldCheck size={20} />
            </div>
            <p className="text-sm font-bold text-ink">Πρόσβαση καταχώρησης</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              Οι χρήστες συνδέονται με Supabase Auth και πρέπει να είναι ενεργοποιημένοι από διαχειριστή.
            </p>
          </div>
        </section>

        {!isSupabaseConfigured ? (
          <div className="mb-5 border-l-4 border-govcyan bg-white px-4 py-3 text-sm text-ink">
            Τρέχει σε demo mode επειδή δεν έχουν οριστεί Supabase μεταβλητές στο `.env.local`.
          </div>
        ) : null}

        {error ? (
          <div className="mb-5 border-l-4 border-signal bg-white px-4 py-3 text-sm font-bold text-signal">
            {error}
          </div>
        ) : null}

        {!user ? (
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="border border-slate-300 bg-white p-5 sm:p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center bg-govblue text-white">
                <LockKeyhole size={23} />
              </div>
              <h2 className="text-xl font-bold text-ink">Απαιτείται σύνδεση</h2>
              <p className="mt-2 max-w-2xl text-base leading-7 text-slate-700">
                Μετά τη σύνδεση θα μπορείτε να επιλέξετε σημείο στον χάρτη, να ορίσετε τύπο συμβάντος, διάρκεια και ένταση.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center bg-govblue px-5 font-bold text-white hover:bg-[#00285a]"
                >
                  Σύνδεση χρήστη
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center justify-center border border-govblue bg-white px-5 font-bold text-govblue hover:bg-govgray"
                >
                  Αίτημα πρόσβασης
                </Link>
              </div>
            </div>

            <div className="border border-slate-300 bg-white p-5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center bg-govgray text-govblue">
                <MapPinned size={23} />
              </div>
              <h2 className="text-lg font-bold text-ink">Τι καταγράφεται</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                <li>Σύγκρουση οχημάτων</li>
                <li>Ακινητοποιημένο όχημα</li>
                <li>Έργα ή κλείσιμο λωρίδας</li>
                <li>Αντικείμενο στο οδόστρωμα</li>
                <li>Καιρικό ή έκτακτο συμβάν</li>
              </ul>
            </div>
          </section>
        ) : (
          <section>
            <div className="mb-5 flex flex-col gap-3 border border-slate-300 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-ink">Νέα καταχώρηση</h2>
                <p className="text-sm text-slate-600">
                  Συνδεδεμένος χρήστης: {user.email}
                </p>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center border border-govblue px-4 text-sm font-bold text-govblue hover:bg-govgray"
              >
                Προβολή επιχειρησιακού dashboard
              </Link>
            </div>
            {loading ? (
              <div className="mb-5 border-l-4 border-govcyan bg-white px-4 py-3 text-sm text-ink">
                Φόρτωση συμβάντων...
              </div>
            ) : null}
            <IncidentForm incidents={items} onSubmit={handleCreateIncident} />
          </section>
        )}
      </div>
    </Layout>
  );
}
