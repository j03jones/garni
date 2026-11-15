# Hosted database (Supabase)

`schema.sql` creates the tables and the access rules for the shared, logged-in version of the app:
accounts, restaurants with staff logins, private / restaurant / community recipes, the approval
flow, invite-only sign-up, and the free-plan limit.

## Set up a new project
1. Create a Supabase project (free plan is fine while testing).
2. In `schema.sql`, change `CHANGE-ME@example.com` to the email you will use as admin.
3. Supabase dashboard > SQL Editor > New query > paste `schema.sql` > Run.
4. Authentication > Providers > Email: keep **Confirm email** switched ON.
5. Sign up in the app with the admin email straight away.

Everyone else needs an invite code (made with `create_invite`) until `app_settings.open_signup` is set to true.

## Email (Resend)
Sign-up confirmations and password resets are sent by Supabase. Supabase's built-in sender only
allows a couple of emails an hour, so they go through Resend instead, from
`Garni <hello@mail.garni.page>` (domain verified in Resend). The app's own
code never touches the Resend key: the site is public, so a key in it could be read by anyone.

1. Resend > API keys: use a key with **Sending access** restricted to `mail.garni.page`.
2. Supabase > Authentication > **Emails** > **SMTP Settings** (older dashboards: Project Settings >
   Authentication > SMTP Settings) > **Enable Custom SMTP**:
   - Sender email: `hello@mail.garni.page`, Sender name: `Garni`
   - Host: `smtp.resend.com`, Port: `465`, Username: `resend`, Password: the Resend key
3. Authentication > **Rate Limits**: raise "emails sent per hour" (custom SMTP starts at 30) if needed.
4. Authentication > **URL Configuration**: Site URL `https://garni.page`, and add
   `https://garni.page/**` to Redirect URLs so reset links can return to the app.
5. Authentication > **Emails** > **Templates**: paste the files from `email-templates/` into the
   matching template, with these subjects:
   - Confirm signup: `confirm-signup.html`, "Confirm your Garni account"
   - Reset password: `reset-password.html`, "Reset your Garni password"
   - Change email address: `change-email.html`, "Confirm your new email address"
   - Magic link: `magic-link.html`, "Your Garni sign-in link"
   - Invite user: `invite.html`, "You're invited to Garni"
6. Test: sign up with a spare address and use "Forgot password?" in the app, then check
   resend.com/emails shows both as Delivered.

## Test the rules
    bash supabase/test/run.sh

This starts a throwaway local PostgreSQL, loads small stand-ins for Supabase's login system, applies
`schema.sql` and tries to break it (reading other people's recipes, promoting yourself, skipping the
invite code, and so on). It needs the PostgreSQL server binaries installed.

## Adding things later
`add_user_data.sql` adds the table that keeps starred recipes with the person's account. Projects created
before it existed run it once in the SQL Editor (it is safe to run again). New projects get it from `schema.sql`.

`add_admin_lists.sql` adds the **Invite codes** and **People** lists in Admin tools: see every code
and who used it, cancel a code, see who has joined (and who has not confirmed their email yet), and
remove someone. Removing a person deletes their account and private recipes; recipes of theirs that
are already live in Community stay, still credited to them. Existing projects run it once in the SQL
Editor (safe to run again). New projects get it from `schema.sql`.

`add_photos.sql` adds dish photos and profile photos. It creates a private Storage bucket called
`photos` and the rules for it: a dish photo is visible to whoever can see the recipe (so Community
photos appear once you approve the recipe), photos on built-in library recipes are visible only to
the person who took them, and profile photos are visible to anyone signed in. The app shrinks photos
on the phone to about 200 KB before uploading. Existing projects run it once in the SQL Editor
(safe to run again). New projects get it from `schema.sql`.

## Garni Pro, tips and starter packs
`add_pro_and_packs.sql` (safe to run again; new projects get it from `schema.sql`) adds:

- `entitlements`: what each account has bought (`pro`, `supporter`, or `pack:<id>`). People can read
  their own; nobody writes to it from the app. Rows come from the `stripe-webhook` function, or from
  **Admin tools → Purchases** (`admin_grant` / `admin_revoke`), for testing and gifts. Taking something back
  sets `revoked_at` rather than deleting the row.
- `is_pro()`, and `is_paid()` now also counts Pro, so Pro lifts the 25-recipe free limit. Recipes copied in
  from a pack don't count toward that limit.
- `packs` and `pack_recipes`: starter packs kept on the server. Anyone can see a published pack and its
  recipe titles (`pack_preview`); the recipes themselves are only copied into your private recipes by
  `claim_pack`, which needs Pro or that pack when the pack has a price. (The free packs picked from the
  built-in library live in `web/js/packs.js` and need no database.)

### Turning payments on (Stripe), later
Nothing below is needed until there's a Stripe account; until then the Pro card says payments open soon.

1. In Stripe, make one-time Payment Links: Garni Pro ($29) and, if you like, tips ($3, $5, $10). On each,
   add metadata `product` = `pro` (or `supporter` for tips), and set the after-payment page to
   `https://garni.page/#/settings`.
2. Paste each link into `PAYMENT_LINKS` in `web/js/pro.js`. The app adds the account id
   (`client_reference_id`) and email, so the purchase lands on the right account.
3. Deploy the webhook: `supabase functions deploy stripe-webhook --no-verify-jwt`
   (Stripe signs its calls instead; the function checks the `Stripe-Signature` header).
4. In Stripe → Developers → Webhooks, add `https://<project>.supabase.co/functions/v1/stripe-webhook`
   for `checkout.session.completed` and `charge.refunded`, then save its signing secret:
   `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`
   Optional: `STRIPE_PRODUCTS='{"plink_...":"pro"}'` maps Payment Link ids to products instead of metadata.
5. A refund marks the purchase revoked. The phone apps never show Buy buttons (the stores want their own
   in-app purchase); Pro bought on the web still counts in them.

Restaurant billing (`restaurants.subscription_status`) is still set by hand in Admin tools.

## Who can see what
Passwords are stored hashed by Supabase and never visible to anyone. Every table has row-level security, so
the app's logins can only read what the rules allow. Two honest caveats: the administrator account can read
every recipe, including private ones (that is how approvals work), and you as the project owner can see
everything in the Supabase dashboard. Tell students and clients that "private" means private from other users.

`add_source_credit.sql` keeps recipes imported from other websites (they carry a credit and a link to the
original) out of Community. Run it after `add_photos.sql`. Existing projects run it once in the SQL
Editor (safe to run again). New projects get it from `schema.sql`.

## Import from a web page (edge function)
The phone app's "Import a recipe from a web page" needs the `import-recipe` function. It reads the one
page a signed-in person asks for and returns only its schema.org Recipe block. Nothing is stored.

    supabase functions deploy import-recipe --project-ref <your project ref>

Keep "Verify JWT" switched on so only signed-in people can use it.

`add_link_cards.sql` adds Community link cards (`share_link_to_community`): an imported recipe is shared
as just its name, credit and original link. Run it after `add_source_credit.sql` (safe to run again).

## Invites: links, QR codes, email and requests
`add_invite_links.sql` (run after `add_link_cards.sql`, safe to run again) adds:
- `invite_info(code)`: what the join page (`#/join/CODE`, opened from a link or QR code) shows before
  sign-up. Anyone with the code can call it; it never reveals who made or used a code.
- `invite_requests` + `request_invite(...)`: the "Request" form for people without a code. Only the
  admin can read requests (Admin tools > Invite requests).
- `invites.email`: which address an emailed invite went to.

Emailed invites use the `send-invite` edge function: it makes a one-person code as the signed-in caller
(so `create_invite`'s rules decide who may invite whom) and asks Supabase Auth to send its "Invite user"
email through the Resend SMTP. No email key is needed in the function.

    supabase functions deploy send-invite      (keep Verify JWT on)

Paste `email-templates/invite.html` into Authentication > Emails > **Invite user**. The link signs the
person in and the app asks them to choose a password.

## Invite request emails and the open sign-up switch
`add_signup_settings.sql` (run after `add_invite_links.sql`, safe to run again) adds `signup_open()`, which
the sign-up form reads, and makes `request_invite` report whether a request is new.

The app's Request form goes through the `request-invite` edge function. It saves the request, and the
first time someone asks it emails the admin address in `app_settings` through Resend: their name, email,
what they are, their note and an "Open Admin tools" button, with reply-to set to them. It uses an
idempotency key and retries, and sends at most 10 emails an hour (more requests just wait in Admin tools).

    supabase functions deploy request-invite --no-verify-jwt      (signed-out visitors call it)

Add the secret **RESEND_API_KEY** (Edge Functions > Secrets) with a Resend key that can send from
`mail.garni.page`. Without it, requests are still saved but no email goes out.

**Open sign-up** is the switch in Admin tools > Sign-up (it sets `app_settings.open_signup`). When it is
on, anyone can create a free student account without a code, the Request tab is hidden, and invite
links and restaurant codes still work.

## Function access tidy-up
`tighten_function_access.sql` (run after everything above, safe to run again) removes grants the
Supabase security advisor flags: signed-out visitors could call `admin_list_invites()` (it refused
them, so nothing leaked), and trigger functions were listed as callable. New projects get this from
`schema.sql`; existing projects run it once in the SQL Editor.

The advisor also suggests switching on **Authentication > Sign In / Providers > Email > Leaked password
protection**, which rejects passwords known from data breaches. That is a dashboard switch, not SQL.

## Meal plan and shopping list
`add_planner.sql` (run after `add_user_data.sql`, safe to run again) adds one column, `user_data.planner`:
a JSON document per person holding their meal plan and shopping list. Only its owner can read or write
it (the existing `user_data_own` rule). Until it is run, the app keeps plans and lists on the device and
shows "the database needs supabase/add_planner.sql" under the plan when signed in.

## Deleting your own account
`add_delete_own_account.sql` (run after `tighten_function_access.sql`, safe to run again) adds
`delete_my_account()`, behind Settings > Account > *Delete my account*. The App Store and Google Play
require apps with sign-up to offer this. The app deletes the person's photos from Storage first, then the
function deletes their recipes (Community ones too) and their account, which takes their profile, stars,
notes, meal plan and shopping list with it. The admin account can't delete itself, and the only owner of a
restaurant has to make someone else an owner first. New projects get this from `schema.sql`.

## Households (a shared shopping list)
`add_households.sql` (run after `add_delete_own_account.sql`, safe to run again) lets the people you live with
share one shopping list. Someone starts a household on the Shopping list page and gets a six-letter code;
the others join with it (up to 8 people, one household each). The list is one JSON document; each phone
puts its own changes since its last sync on top of the latest copy (`merge3` in `web/js/shopping.js`), so
two people ticking things off at the same time don't undo each other, and phones with the list open check
for changes every few seconds. Leaving keeps your list on your phone; the last one out removes the
household. Deleting your account leaves it too. New projects get this from `schema.sql`.
