import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  BarChart3,
  Clock,
  Edit3,
  FilePlus2,
  Filter,
  ListChecks,
  MapPinned,
  RadioTower,
  Save,
  Trash2,
  X,
} from "lucide-react";
import Layout from "../components/Layout";
import IncidentForm from "../components/IncidentForm";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  addIncident,
  incidentTypes,
  removeIncident,
  setFilter,
  setIncidents,
  setIncidentsError,
  setIncidentsLoading,
  updateIncident,
} from "../store/incidentSlice";

const IncidentMap = dynamic(() => import("../components/IncidentMap"), { ssr: false });

const periods = [
  { value: "24h", label: "Τελευταίες 24 ώρες" },
  { value: "7d", label: "Τελευταίες 7 ημέρες" },
  { value: "30d", label: "Τελευταίες 30 ημέρες" },
  { value: "year", label: "Αυτό το έτος" },
  { value: "all", label: "Από την αρχή" },
];

function typeLabel(value) {
  return incidentTypes.find((type) => type.value === value)?.label || value;
}

function severityLabel(value) {
  if (value === "high") return "Υψηλή";
  if (value === "medium") return "Μέτρια";
  return "Χαμηλή";
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

function periodStart(period) {
  const now = new Date();
  if (period === "24h") return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (period === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return null;
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const { items, filters, loading, error } = useSelector((state) => state.incidents);
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState("create");
  const [profile, setProfile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    async function loadProfileAndIncidents() {
      if (!isSupabaseConfigured || !user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role,is_authorized,email")
        .eq("id", user.id)
        .single();
      setProfile(profileData || null);

      dispatch(setIncidentsLoading(true));
      const { data, error: fetchError } = await supabase
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (fetchError) {
        dispatch(setIncidentsError(fetchError.message));
        return;
      }

      dispatch(setIncidents(data || []));
    }

    loadProfileAndIncidents();
  }, [dispatch, user]);

  const filteredItems = useMemo(() => {
    const start = periodStart(filters.period);

    return items.filter((incident) => {
      const typeMatch = filters.type === "all" || incident.type === filters.type;
      const periodMatch = !start || new Date(incident.created_at) >= start;
      return typeMatch && periodMatch;
    });
  }, [items, filters]);

  const stats = useMemo(() => {
    const averageDuration = filteredItems.length
      ? Math.round(
          filteredItems.reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0) /
            filteredItems.length
        )
      : 0;
    const topType = incidentTypes
      .map((type) => ({
        ...type,
        count: filteredItems.filter((incident) => incident.type === type.value).length,
      }))
      .sort((a, b) => b.count - a.count)[0];

    return { total: filteredItems.length, averageDuration, topType };
  }, [filteredItems]);

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

  function startEditing(incident) {
    setEditingId(incident.id);
    setDraft({
      title: incident.title,
      type: incident.type,
      duration_minutes: incident.duration_minutes,
      severity: incident.severity,
      description: incident.description || "",
    });
  }

  async function saveEdit(incident) {
    const payload = {
      ...draft,
      duration_minutes: Number(draft.duration_minutes),
    };

    if (isSupabaseConfigured) {
      const { data, error: updateError } = await supabase
        .from("incidents")
        .update(payload)
        .eq("id", incident.id)
        .select()
        .single();

      if (updateError) {
        dispatch(setIncidentsError(updateError.message));
        return;
      }

      dispatch(updateIncident(data));
    } else {
      dispatch(updateIncident({ ...incident, ...payload }));
    }

    setEditingId(null);
    setDraft(null);
  }

  async function deleteIncident(incident) {
    const confirmed = window.confirm(`Διαγραφή εγγραφής: ${incident.title};`);
    if (!confirmed) return;

    if (isSupabaseConfigured) {
      const { error: deleteError } = await supabase.from("incidents").delete().eq("id", incident.id);

      if (deleteError) {
        dispatch(setIncidentsError(deleteError.message));
        return;
      }
    }

    dispatch(removeIncident(incident.id));
  }

  const isAdmin = profile?.role === "admin" || !isSupabaseConfigured;

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
              Dashboard ιστορικών περιστατικών
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
              Καταχώρηση, διαχείριση εγγραφών και χαρτογραφική ανάλυση σημείων συμφόρησης.
            </p>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:mt-0">
            <Stat icon={MapPinned} label="Σύνολο" value={stats.total} />
            <Stat icon={Clock} label="Μέση διάρκεια" value={`${stats.averageDuration}'`} />
            <Stat icon={BarChart3} label="Συχνότερο" value={stats.topType?.count ? stats.topType.label : "-"} compact />
          </div>
        </section>

        {error ? (
          <div className="mb-5 border-l-4 border-signal bg-white px-4 py-3 text-sm font-bold text-signal">
            {error}
          </div>
        ) : null}

        <nav className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <TabButton icon={FilePlus2} label="Καταχώρηση" active={activeTab === "create"} onClick={() => setActiveTab("create")} />
          <TabButton icon={ListChecks} label="Εγγραφές" active={activeTab === "records"} onClick={() => setActiveTab("records")} />
          <TabButton icon={MapPinned} label="Χάρτης" active={activeTab === "map"} onClick={() => setActiveTab("map")} />
        </nav>

        {activeTab === "create" ? (
          <IncidentForm incidents={items} onSubmit={handleCreateIncident} />
        ) : null}

        {activeTab === "records" ? (
          <RecordsPanel
            incidents={items}
            loading={loading}
            isAdmin={isAdmin}
            editingId={editingId}
            draft={draft}
            setDraft={setDraft}
            startEditing={startEditing}
            cancelEditing={() => {
              setEditingId(null);
              setDraft(null);
            }}
            saveEdit={saveEdit}
            deleteIncident={deleteIncident}
          />
        ) : null}

        {activeTab === "map" ? (
          <MapPanel incidents={filteredItems} filters={filters} dispatch={dispatch} />
        ) : null}
      </div>
    </Layout>
  );
}

function TabButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-12 items-center justify-center gap-2 border px-4 text-sm font-bold ${
        active
          ? "border-govblue bg-govblue text-white"
          : "border-slate-300 bg-white text-govblue hover:bg-govgray"
      }`}
    >
      <Icon size={17} />
      {label}
    </button>
  );
}

function Filters({ filters, dispatch }) {
  return (
    <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 sm:flex sm:items-center">
      <Filter size={16} />
      <select
        value={filters.type}
        onChange={(event) => dispatch(setFilter({ name: "type", value: event.target.value }))}
        className="min-h-10 w-full border border-slate-400 bg-white px-3 py-2 outline-none focus:border-govblue focus:ring-2 focus:ring-govcyan sm:w-auto"
      >
        <option value="all">Όλες οι κατηγορίες</option>
        {incidentTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
      <select
        value={filters.period}
        onChange={(event) => dispatch(setFilter({ name: "period", value: event.target.value }))}
        className="min-h-10 w-full border border-slate-400 bg-white px-3 py-2 outline-none focus:border-govblue focus:ring-2 focus:ring-govcyan sm:w-auto"
      >
        {periods.map((period) => (
          <option key={period.value} value={period.value}>
            {period.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function MapPanel({ incidents, filters, dispatch }) {
  return (
    <section className="overflow-hidden border border-slate-300 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-300 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-ink">Χάρτης συμβάντων και heatmap</h2>
        <Filters filters={filters} dispatch={dispatch} />
      </div>
      <div className="h-[360px] sm:h-[620px]">
        <IncidentMap incidents={incidents} />
      </div>
    </section>
  );
}

function RecordsPanel({
  incidents,
  loading,
  isAdmin,
  editingId,
  draft,
  setDraft,
  startEditing,
  cancelEditing,
  saveEdit,
  deleteIncident,
}) {
  return (
    <section className="border border-slate-300 bg-white">
      <div className="flex flex-col gap-2 border-b border-slate-300 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">Εγγραφές περιστατικών</h2>
          <p className="text-sm text-slate-600">
            {isAdmin ? "Ως admin μπορείτε να επεξεργαστείτε ή να διαγράψετε εγγραφές." : "Η επεξεργασία και διαγραφή είναι διαθέσιμες μόνο σε admin."}
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {loading ? (
          <p className="p-4 text-sm text-slate-600">Φόρτωση...</p>
        ) : incidents.length ? (
          incidents.map((incident) => (
            <IncidentRecord
              key={incident.id}
              incident={incident}
              isAdmin={isAdmin}
              isEditing={editingId === incident.id}
              draft={draft}
              setDraft={setDraft}
              startEditing={startEditing}
              cancelEditing={cancelEditing}
              saveEdit={saveEdit}
              deleteIncident={deleteIncident}
            />
          ))
        ) : (
          <p className="p-4 text-sm text-slate-600">Δεν υπάρχουν εγγραφές με αυτά τα φίλτρα.</p>
        )}
      </div>
    </section>
  );
}

function IncidentRecord({
  incident,
  isAdmin,
  isEditing,
  draft,
  setDraft,
  startEditing,
  cancelEditing,
  saveEdit,
  deleteIncident,
}) {
  if (isEditing) {
    return (
      <article className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            className="min-h-10 border border-slate-400 px-3 py-2 outline-none focus:border-govblue focus:ring-2 focus:ring-govcyan sm:col-span-2"
          />
          <select
            value={draft.type}
            onChange={(event) => setDraft({ ...draft, type: event.target.value })}
            className="min-h-10 border border-slate-400 px-3 py-2 outline-none focus:border-govblue focus:ring-2 focus:ring-govcyan"
          >
            {incidentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            value={draft.severity}
            onChange={(event) => setDraft({ ...draft, severity: event.target.value })}
            className="min-h-10 border border-slate-400 px-3 py-2 outline-none focus:border-govblue focus:ring-2 focus:ring-govcyan"
          >
            <option value="low">Χαμηλή</option>
            <option value="medium">Μέτρια</option>
            <option value="high">Υψηλή</option>
          </select>
          <input
            type="number"
            value={draft.duration_minutes}
            onChange={(event) => setDraft({ ...draft, duration_minutes: event.target.value })}
            className="min-h-10 border border-slate-400 px-3 py-2 outline-none focus:border-govblue focus:ring-2 focus:ring-govcyan"
          />
          <textarea
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            className="min-h-20 border border-slate-400 px-3 py-2 outline-none focus:border-govblue focus:ring-2 focus:ring-govcyan sm:col-span-2"
          />
        </div>
        <div className="flex gap-2 lg:justify-end">
          <button
            type="button"
            onClick={() => saveEdit(incident)}
            className="inline-flex h-10 items-center justify-center gap-2 bg-govblue px-3 text-sm font-bold text-white"
          >
            <Save size={16} />
            Αποθήκευση
          </button>
          <button
            type="button"
            onClick={cancelEditing}
            className="inline-flex h-10 items-center justify-center gap-2 border border-slate-300 px-3 text-sm font-bold text-slate-700"
          >
            <X size={16} />
            Άκυρο
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-start gap-2">
          <h3 className="font-bold text-ink">{incident.title}</h3>
          <span className="border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
            {severityLabel(incident.severity)}
          </span>
        </div>
        <p className="text-sm text-slate-600">{typeLabel(incident.type)}</p>
        {incident.description ? <p className="mt-2 text-sm text-slate-600">{incident.description}</p> : null}
        <p className="mt-2 text-xs font-semibold text-slate-500">
          {incident.duration_minutes} λεπτά · {formatAthensDateTime(incident.created_at)} · {incident.latitude}, {incident.longitude}
        </p>
      </div>
      <div className="flex gap-2 lg:justify-end">
        {isAdmin ? (
          <>
            <button
              type="button"
              onClick={() => startEditing(incident)}
              className="inline-flex h-10 items-center justify-center gap-2 border border-govblue px-3 text-sm font-bold text-govblue hover:bg-govgray"
            >
              <Edit3 size={16} />
              Επεξεργασία
            </button>
            <button
              type="button"
              onClick={() => deleteIncident(incident)}
              className="inline-flex h-10 items-center justify-center gap-2 border border-signal px-3 text-sm font-bold text-signal hover:bg-red-50"
            >
              <Trash2 size={16} />
              Διαγραφή
            </button>
          </>
        ) : null}
      </div>
    </article>
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
