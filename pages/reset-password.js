import { Formik, Form } from "formik";
import * as Yup from "yup";
import { KeyRound } from "lucide-react";
import Layout from "../components/Layout";
import { AuthShell, Input } from "./login";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const schema = Yup.object({
  email: Yup.string().email("Μη έγκυρο email").required("Απαιτείται email"),
});

export default function ResetPassword() {
  async function handleSubmit(values, helpers) {
    if (!isSupabaseConfigured) {
      helpers.setStatus("Demo mode: δεν στάλθηκε email.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/login`,
    });

    helpers.setStatus(error ? error.message : "Στάλθηκε email επαναφοράς.");
  }

  return (
    <Layout>
      <AuthShell title="Επαναφορά κωδικού">
        <Formik initialValues={{ email: "" }} validationSchema={schema} onSubmit={handleSubmit}>
          {({ isSubmitting, status }) => (
            <Form className="space-y-4">
              {status ? <p className="border-l-4 border-govcyan bg-govgray px-3 py-2 text-sm text-ink">{status}</p> : null}
              <Input name="email" label="Email" type="email" />
              <button className="inline-flex h-12 w-full items-center justify-center gap-2 bg-govblue font-bold text-white hover:bg-[#00285a]" disabled={isSubmitting}>
                <KeyRound size={18} />
                Αποστολή reset
              </button>
            </Form>
          )}
        </Formik>
      </AuthShell>
    </Layout>
  );
}
