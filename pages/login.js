import Link from "next/link";
import { useRouter } from "next/router";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { LogIn } from "lucide-react";
import Layout from "../components/Layout";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const schema = Yup.object({
  email: Yup.string().email("Μη έγκυρο email").required("Απαιτείται email"),
  password: Yup.string().min(6, "Τουλάχιστον 6 χαρακτήρες").required("Απαιτείται κωδικός"),
});

export default function Login() {
  const router = useRouter();

  async function handleSubmit(values, helpers) {
    if (!isSupabaseConfigured) {
      router.push("/");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      helpers.setStatus(error.message);
      return;
    }
    router.push("/");
  }

  return (
    <Layout>
      <AuthShell title="Σύνδεση εξουσιοδοτημένου χρήστη">
        <Formik initialValues={{ email: "", password: "" }} validationSchema={schema} onSubmit={handleSubmit}>
          {({ isSubmitting, status }) => (
            <Form className="space-y-4">
              {status ? <p className="border-l-4 border-signal bg-red-50 px-3 py-2 text-sm text-signal">{status}</p> : null}
              <Input name="email" label="Email" type="email" />
              <Input name="password" label="Κωδικός" type="password" />
              <button className="inline-flex h-12 w-full items-center justify-center gap-2 bg-govblue font-bold text-white hover:bg-[#00285a]" disabled={isSubmitting}>
                <LogIn size={18} />
                Σύνδεση
              </button>
              <div className="flex justify-between text-sm">
                <Link href="/register" className="font-semibold text-govblue underline underline-offset-2">Νέος λογαριασμός</Link>
                <Link href="/reset-password" className="font-semibold text-govblue underline underline-offset-2">Reset κωδικού</Link>
              </div>
            </Form>
          )}
        </Formik>
      </AuthShell>
    </Layout>
  );
}

export function AuthShell({ title, children }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-83px)] max-w-md items-center px-4 py-10">
      <section className="w-full border border-slate-300 bg-white p-5 sm:p-6">
        <h1 className="mb-5 text-2xl font-bold text-ink">{title}</h1>
        {children}
      </section>
    </div>
  );
}

export function Input({ name, label, type = "text" }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-ink" htmlFor={name}>{label}</label>
      <Field id={name} name={name} type={type} className="min-h-11 w-full border border-slate-400 px-3 py-2 outline-none focus:border-govblue focus:ring-2 focus:ring-govcyan" />
      <ErrorMessage name={name} component="p" className="mt-1 text-sm text-signal" />
    </div>
  );
}
