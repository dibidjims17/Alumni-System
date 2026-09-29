# Account Status vs. Onboarding (design note)

## Current state
- `Student.IsActive` is an **admin kill switch only**: defaults to `true` on
  import/create, flipped solely by the toggle-status endpoint. It says
  nothing about whether the student ever opened the account.
- "Hasn't onboarded" is currently approximated by `MustChangePassword=true`,
  which is a **password-flow concept**, not an activation record. There is
  no first-login timestamp on `Student` (logins are only visible by scanning
  the activity log).

## What Google sign-in breaks
A Google user has no password, so "change your password to activate" is
meaningless for them:
- They can never satisfy `MustChangePassword=false`-as-onboarding and would
  sit mislabeled as inactive/unclaimed forever.
- Temporary-password expiry logic dangles (nothing to expire).
- The admin list would lie about who actually uses the app.
- Google email ownership is verified by Google itself — strictly stronger
  proof of identity than a temp password, so it should *claim* the account,
  not get stuck behind password gates.

## Recommendations (not yet implemented)
1. **Split the concepts.** Keep `IsActive` as the pure admin enable/disable
   switch. Add `ActivatedAt` (nullable timestamp) set on first successful
   login by *either* method. "Unclaimed" = `ActivatedAt` is null AND
   `MustChangePassword` is still true.
2. **Google claims the account.** First Google login with a matching verified
   school email sets `ActivatedAt`, clears `MustChangePassword` and any temp
   password state. No password ever required on that path.
3. **No data migration needed.** Backfill rule: anyone with
   `MustChangePassword=false` already counts as onboarded.
4. **Admin UI.** Show an Unclaimed/Invited badge next to Active/Inactive,
   add a filter for it, and point the resend-invite action at unclaimed
   accounts.
5. **Email mismatch path.** Google email with no matching record gets a
   clear "no account found — contact admin" error (never auto-create;
   strangers must not be able to enter). Admins can correct the email via
   the existing Students edit modal.
6. **Keep password login as fallback.** Defense venues may lack internet,
   which Google login requires. Both methods update the same activation
   state.
