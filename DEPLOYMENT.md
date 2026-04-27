# Deployment

Recommended deployment target: Vercel.

## GitHub

```bash
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

## Vercel

1. Import the GitHub repository in Vercel.
2. Framework preset: Next.js.
3. Build command: `npm run build`.
4. Add environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://nymmxxasxenyktylzosn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Ft9Al1CPyPT9ogmXMleybg_WpTGG32_
```

5. Deploy.

## Supabase Auth URLs

After Vercel gives you a production URL, add it in Supabase:

- Authentication -> URL Configuration -> Site URL
- Authentication -> URL Configuration -> Redirect URLs

Use:

```text
https://your-vercel-domain.vercel.app
https://your-vercel-domain.vercel.app/login
```
