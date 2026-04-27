import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  BarChart3,
  Clock,
  Filter,
  MapPinned,
  RadioTower,
} from "lucide-react";
import Layout from "../components/Layout";
import IncidentForm from "../components/IncidentForm";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  addIncident,
  incidentTypes,
  setFilter,
  setIncidents,
  setIncidentsError,
  setIncidentsLoading,
} from "../store/incidentSlice";

const IncidentMap = dynamic(() => import("../components/IncidentMap"), { ssr: false });

function typeLabel(value) {
  return incidentTypes.find((type) => type.value === value)?.label || value;
}

function formatAthensDateTime(value) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(new Date(value))
    .reduce((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});

  return `${parts.day}/${parts.month}/${parts.year}, ${parts.hour}:${parts.minute}`;
}

export default function Home() {
  const dispatch = useDispatch();
  const { items, filters, loading, error } = useSelector((state) => state.incidents);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    async function loadIncidents() {
      if (!isSupabaseConfigured || !user) return;

      dispatch(setIncidentsLoading(true));
      const { data, error: fetchError } = await supabase
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (fetchError) {
        dispatch(setIncidentsError(fetchError.message));
        return;
      }

      dispatch(setIncidents(data || []));
    }

    loadIncidents();
  }, [dispatch, user]);

  const filteredItems = useMemo(
    () =>
      items.filter((incident) => {
        const typeMatch = filters.type === "all" || incident.type === filters.type;
        return typeMatch;
      }),
    [items, filters]
  );

  const stats = useMemo(() => {
    const averageDuration = items.length
      ? Math.round(items.reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0) / items.length)
      : 0;
    const topType = incidentTypes
      .map((type) => ({
        ...type,
        count: items.filter((incident) => incident.type === type.value).length,
      }))
      .sort((a, b) => b.count - a.count)[0];

    return { total: items.length, averageDuration, topType };
  }, [items]);

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
        <section className="mb-6 border-b border-slate-300 bg-white px-4 py-5 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 border-l-4 border-govcyan bg-govgray px-3 py-2 text-sm font-bold text-govblue">
              <RadioTower size={16} />
              Επιχειρησιακή εικόνα Κηφισού
            </p>
            <h1 className="max-w-3xl text-2xl font-bold tracking-normal text-ink sm:text-3xl">
              Ιστορικό περιστατικών κυκλοφορίας
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
              Συγκεντρωτική εικόνα καταχωρήσεων με χάρτη, heatmap και στατιστικά για ανάλυση επαναλαμβανόμενων σημείων συμφόρησης.
            </p>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:mt-0">
            <Stat icon={MapPinned} label="Σύνολο" value={stats.total} />
            <Stat icon={Clock} label="Μέση διάρκεια" value={`${stats.averageDuration}'`} />
            <Stat icon={BarChart3} label="Συχνότερο" value={stats.topType?.count ? stats.topType.label : "-"} compact />
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

        <IncidentForm incidents={filteredItems} onSubmit={handleCreateIncident} />

        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-hidden border border-slate-300 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-300 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-bold text-ink">Heatmap και συμβάντα</h2>
              <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 sm:flex sm:items-center">
                <Filter size={16} />
                <select
                  value={filters.type}
                  onChange={(event) => dispatch(setFilter({ name: "type", value: event.target.value }))}
                  className="min-h-10 w-full border border-slate-400 bg-white px-3 py-2 outline-none focus:border-govblue focus:ring-2 focus:ring-govcyan sm:w-auto"
                >
                  <option value="all">Όλοι οι τύποι</option>
                  {incidentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="h-[320px] sm:h-[460px]">
              <IncidentMap incidents={filteredItems} />
            </div>
          </div>

          <div className="border border-slate-300 bg-white">
            <div className="border-b border-slate-300 px-4 py-4">
              <h2 className="text-lg font-bold text-ink">Πρόσφατες καταχωρήσεις</h2>
            </div>
            <div className="max-h-[520px] divide-y divide-slate-100 overflow-auto">
              {loading ? (
                <p className="p-4 text-sm text-slate-600">Φόρτωση...</p>
              ) : filteredItems.length ? (
                filteredItems.map((incident) => <IncidentRow key={incident.id} incident={incident} />)
              ) : (
                <p className="p-4 text-sm text-slate-600">Δεν υπάρχουν συμβάντα με αυτά τα φίλτρα.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

function Stat({ icon: Icon, label, value, compact }) {
  return (
    <div className="border border-slate-300 bg-govgray p-3">
      <div className="mb-2 flex h-8 w-8 items-center justify-center bg-govblue text-white">
        <Icon size={17} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className={`${compact ? "text-sm leading-5" : "text-2xl"} font-bold text-ink`}>{value}</p>
    </div>
  );
}

function IncidentRow({ incident }) {
  const type = incidentTypes.find((item) => item.value === incident.type);

  return (
    <article className="p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-ink">{incident.title}</h3>
          <p className="text-sm text-slate-600">{type?.label || incident.type}</p>
        </div>
        <span className="inline-flex shrink-0 items-center border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
          {incident.severity === "high" ? "Υψηλή" : incident.severity === "medium" ? "Μέτρια" : "Χαμηλή"}
        </span>
      </div>
      {incident.description ? <p className="mb-2 text-sm text-slate-600">{incident.description}</p> : null}
      <p className="text-xs font-semibold text-slate-500">
        {incident.duration_minutes} λεπτά · {formatAthensDateTime(incident.created_at)}
      </p>
    </article>
  );
}
