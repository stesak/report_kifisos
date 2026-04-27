import dynamic from "next/dynamic";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Clock, LocateFixed, Send } from "lucide-react";
import { incidentTypes } from "../store/incidentSlice";

const IncidentMap = dynamic(() => import("./IncidentMap"), { ssr: false });

const schema = Yup.object({
  title: Yup.string().min(4, "Πολύ σύντομος τίτλος").required("Απαιτείται τίτλος"),
  type: Yup.string().required("Επιλέξτε τύπο"),
  description: Yup.string().max(500, "Μέγιστο 500 χαρακτήρες"),
  latitude: Yup.number().required("Επιλέξτε σημείο στον χάρτη"),
  longitude: Yup.number().required("Επιλέξτε σημείο στον χάρτη"),
  duration_minutes: Yup.number()
    .min(1, "Τουλάχιστον 1 λεπτό")
    .max(1440, "Μέγιστο 24 ώρες")
    .required("Απαιτείται διάρκεια"),
  severity: Yup.string().required("Επιλέξτε ένταση"),
});

export default function IncidentForm({ incidents, onSubmit }) {
  return (
    <Formik
      initialValues={{
        title: "",
        type: "collision",
        description: "",
        latitude: "",
        longitude: "",
        duration_minutes: 30,
        severity: "medium",
      }}
      validationSchema={schema}
      onSubmit={async (values, helpers) => {
        await onSubmit({
          ...values,
          latitude: Number(values.latitude),
          longitude: Number(values.longitude),
          duration_minutes: Number(values.duration_minutes),
        });
        helpers.resetForm();
      }}
    >
      {({ isSubmitting, values, setFieldValue }) => (
        <Form className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="overflow-hidden border border-slate-300 bg-white">
            <div className="border-b border-slate-300 px-4 py-4">
              <h2 className="text-lg font-bold text-ink">Σημείο συμβάντος</h2>
            </div>
            <div className="h-[320px] sm:h-[440px]">
              <IncidentMap
                incidents={incidents}
                selectedLocation={
                  values.latitude && values.longitude
                    ? { latitude: Number(values.latitude), longitude: Number(values.longitude) }
                    : null
                }
                onPick={(location) => {
                  setFieldValue("latitude", location.latitude);
                  setFieldValue("longitude", location.longitude);
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-300 bg-govgray px-4 py-3 text-sm text-slate-700">
              <LocateFixed size={16} />
              <span>
                {values.latitude && values.longitude
                  ? `${values.latitude}, ${values.longitude}`
                  : "Κάντε κλικ στον χάρτη για σημείο συμβάντος"}
              </span>
              <ErrorMessage name="latitude" component="span" className="font-semibold text-signal" />
            </div>
          </section>

          <section className="border border-slate-300 bg-white p-4 sm:p-5">
            <h2 className="mb-4 text-lg font-bold text-ink">Στοιχεία καταχώρησης</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-ink" htmlFor="title">
                  Τίτλος
                </label>
                <Field
                  id="title"
                  name="title"
                  className="min-h-11 w-full border border-slate-400 px-3 py-2 outline-none focus:border-govblue focus:ring-2 focus:ring-govcyan"
                  placeholder="π.χ. Σύγκρουση στο ύψος ΚΤΕΛ"
                />
                <ErrorMessage name="title" component="p" className="mt-1 text-sm text-signal" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-ink" htmlFor="type">
                  Τύπος συμβάντος
                </label>
                <Field
                  as="select"
                  id="type"
                  name="type"
                  className="min-h-11 w-full border border-slate-400 px-3 py-2 outline-none focus:border-govblue focus:ring-2 focus:ring-govcyan"
                >
                  {incidentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-ink" htmlFor="duration_minutes">
                    Διάρκεια
                  </label>
                  <div className="flex min-h-11 items-center border border-slate-400 px-3 focus-within:border-govblue focus-within:ring-2 focus-within:ring-govcyan">
                    <Clock size={16} className="text-slate-500" />
                    <Field
                      id="duration_minutes"
                      name="duration_minutes"
                      type="number"
                      className="w-full px-2 py-2 outline-none"
                    />
                  </div>
                  <ErrorMessage name="duration_minutes" component="p" className="mt-1 text-sm text-signal" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-ink" htmlFor="severity">
                    Ένταση
                  </label>
                  <Field
                    as="select"
                    id="severity"
                    name="severity"
                    className="min-h-11 w-full border border-slate-400 px-3 py-2 outline-none focus:border-govblue focus:ring-2 focus:ring-govcyan"
                  >
                    <option value="low">Χαμηλή</option>
                    <option value="medium">Μέτρια</option>
                    <option value="high">Υψηλή</option>
                  </Field>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-ink" htmlFor="description">
                  Σημειώσεις
                </label>
                <Field
                  as="textarea"
                  id="description"
                  name="description"
                  rows="4"
                  className="w-full resize-none border border-slate-400 px-3 py-2 outline-none focus:border-govblue focus:ring-2 focus:ring-govcyan"
                  placeholder="Λωρίδες, κατεύθυνση, ορατότητα, εμπλεκόμενα οχήματα..."
                />
                <ErrorMessage name="description" component="p" className="mt-1 text-sm text-signal" />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 bg-govblue px-4 font-bold text-white hover:bg-[#00285a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={18} />
                Καταχώρηση συμβάντος
              </button>
            </div>
          </section>
        </Form>
      )}
    </Formik>
  );
}
