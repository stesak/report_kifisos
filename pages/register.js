import { useRouter } from "next/router";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { UserPlus } from "lucide-react";
import Layout from "../components/Layout";
import { AuthShell, Input } from "./login";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const schema = Yup.object({
  email: Yup.string().email("Μη έγκυρο email").required("Απαιτείται email"),
  password: Yup.string().min(8, "Τουλάχιστον 8 χαρακτήρες").required("Απαιτείται κωδικός"),
});

export default function Register() {
  const router = useRouter();

  async function handleSubmit(values, helpers) {
    if (!isSupabaseConfigured) {
      router.push("/");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });

    if (error) {
      helpers.setStatus(error.message);
      return;
    }

    helpers.setStatus("Ο λογαριασμός δημιουργήθηκε. Περιμένει εξουσιοδότηση από διαχειριστή.");
  }

  return (
    <Layout>
      <AuthShell title="Δημιουργία λογαριασμού">
        <Formik initialValues={{ email: "", password: "" }} validationSchema={schema} onSubmit={handleSubmit}>
          {({ isSubmitting, status }) => (
            <Form className="space-y-4">
              {status ? <p className="border-l-4 border-govcyan bg-govgray px-3 py-2 text-sm text-ink">{status}</p> : null}
              <Input name="email" label="Email" type="email" />
              <Input name="password" label="Κωδικός" type="password" />
              <button className="inline-flex h-12 w-full items-center justify-center gap-2 bg-govblue font-bold text-white hover:bg-[#00285a]" disabled={isSubmitting}>
                <UserPlus size={18} />
                Αίτημα πρόσβασης
              </button>
            </Form>
          )}
        </Formik>
      </AuthShell>
    </Layout>
  );
}
