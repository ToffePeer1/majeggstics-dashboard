# Deployment Workflow

This document explains how the Majeggstics Analytics Dashboard is deployed using Vercel's native deployment system.

## Overview

The project uses **Vercel's native Git integration** for deployments, which automatically:
- Creates preview deployments for every branch and pull request
- Shows deployment status directly on GitHub pull requests
- Allows manual promotion to production via the Vercel Dashboard

Code quality is maintained through **GitHub Actions CI checks** that run on all branches.

---

## Deployment Types

### 1. Preview Deployments (Automatic)

**Trigger:** Push to any branch or opening a pull request

**What happens:**
1. GitHub Actions runs CI checks (typecheck, lint, build)
2. Vercel automatically deploys the branch to a unique preview URL
3. Deployment status appears in the PR as a comment with the preview link
4. Each commit to the branch triggers a new preview deployment

**Access the preview:**
- Check the PR comments for the Vercel bot deployment link
- Preview URL format: `https://majeggstics-dashboard-<branch>-<hash>.vercel.app`
- Click "Visit Preview" in the Vercel comment on GitHub

**Use cases:**
- Testing changes before merging
- Reviewing others' work without checking out locally
- Sharing work-in-progress with team members
- QA testing on real URLs

### 2. Production Deployment (Manual)

**Trigger:** Manual promotion in Vercel Dashboard

**What happens:**
1. Merge PR to `main` branch (after CI checks pass)
2. Vercel creates a preview deployment for the `main` branch
3. Navigate to [Vercel Dashboard](https://vercel.com/dashboard)
4. Find the deployment and click "Promote to Production"
5. Production site updates at https://majeggstics-dashboard.vercel.app

**Why manual?**
- Allows for final verification before going live
- Prevents accidental production deployments
- Gives control over exactly when updates go live
- Useful for coordinating with backend/database changes

---

## GitHub Actions CI Workflow

**File:** `.github/workflows/ci.yml`

**Runs on:**
- Every push to any branch
- Every pull request to `main`

**Checks performed:**
1. **TypeScript Typecheck** - Ensures no type errors
2. **ESLint** - Enforces code style and catches common issues
3. **Build** - Verifies the project builds successfully

**Status:**
- ✅ All checks must pass before merging to `main`
- CI status appears on pull requests
- Blocks merging if checks fail (can be configured in GitHub settings)

---

## Vercel Configuration

### Project Settings

The following settings should be configured in the Vercel Dashboard:

**Build & Development Settings:**
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm ci`

**Git Integration:**
- Production Branch: `main`
- Enable automatic deployments: `Yes`
- Enable preview deployments: `Yes` (all branches)

**Environment Variables:**

Required for all deployments (Production & Preview):
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_DISCORD_CLIENT_ID
VITE_EGGINC_GUILD
VITE_EGGINC_WONKY_LEADER_ROLE
VITE_EGGINC_MAJ_ROLE
```

> **Note:** These should be added in the Vercel Dashboard under Project Settings → Environment Variables

### vercel.json Configuration

The `vercel.json` file configures:
- URL rewrites for React Router (SPA routing)
- Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)

No changes needed - Vercel automatically uses this file.

---

## Workflow Comparison

### Before (Custom Deployment)

```
Push to main → GitHub Actions CI → GitHub Actions deploys via Vercel CLI → Production
Push to other branch → GitHub Actions CI only
```

- Manual Vercel CLI setup in Actions
- No preview deployments for branches
- Automatic production deployment (no approval step)
- Required VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID secrets

### After (Vercel Native)

```
Push to main → GitHub Actions CI + Vercel preview → Manual promotion → Production
Push to other branch → GitHub Actions CI + Vercel preview deployment
```

- No CLI setup needed
- Preview deployments for ALL branches
- Manual production promotion in Vercel Dashboard
- No Vercel secrets needed in GitHub (Git integration handles authentication)
- Deployment status visible directly on GitHub

---

## Step-by-Step: Deploying Changes

### For Contributors

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/my-awesome-feature
   ```

2. **Make changes and commit:**
   ```bash
   # Make your changes
   npm run validate  # Test locally
   git add .
   git commit -m "Add awesome feature"
   git push origin feature/my-awesome-feature
   ```

3. **Open a pull request:**
   - Go to GitHub and open a PR to `main`
   - Wait for CI checks to pass (typecheck, lint, build)
   - Vercel will automatically deploy a preview
   - Review the preview deployment link in the PR comments

4. **Review and iterate:**
   - Test your changes on the preview URL
   - Make additional commits if needed (Vercel auto-deploys updates)
   - Request reviews from team members
   - Share the preview URL for testing

5. **Merge when ready:**
   - Once approved and CI passes, merge the PR
   - Vercel creates a preview for the updated `main` branch

### For Maintainers

6. **Promote to production:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Find the latest `main` branch deployment
   - Click "Promote to Production"
   - Verify the production site is updated

---

## Troubleshooting

### CI checks failing
- Run `npm run validate` locally to reproduce the issue
- Check the GitHub Actions logs for detailed error messages
- Common issues: TypeScript errors, ESLint violations, build failures

### Preview deployment not appearing
- Verify Vercel is connected to the GitHub repository
- Check Vercel Dashboard for deployment logs
- Ensure environment variables are set in Vercel

### Preview deployment shows errors
- Check that all required environment variables are set in Vercel
- Verify the branch builds successfully in CI
- Check browser console for runtime errors

### Want to test before deploying
- Run `npm run build` locally
- Run `npm run preview` to test the production build locally
- Use the preview deployment URL for staging tests

---

## Benefits of This Approach

✅ **Preview deployments for every branch** - Easy collaboration and testing  
✅ **Deployment status on GitHub** - See exactly which version is deployed where  
✅ **Manual production control** - Deploy when YOU'RE ready  
✅ **No CLI secrets to manage** - Vercel Git integration handles authentication  
✅ **Same code quality checks** - CI still enforces typecheck, lint, and build  
✅ **Faster feedback loop** - Instant preview links in PRs  
✅ **Better collaboration** - Share work-in-progress with unique URLs  

---

## Additional Resources

- [Vercel Git Integration Docs](https://vercel.com/docs/concepts/git)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
