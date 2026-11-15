# Getting Garni into Google Play and the App Store

What's ready in the repo:

- The phone apps are on Capacitor 8 (Android targets API 36, as Google Play requires; iOS 15 and up).
- `listing.md` has the store text: name, descriptions, keywords, category, age-rating notes.
- `screenshots/iphone` (1290 × 2796) and `screenshots/android` (1080 × 2340), made by
  `tools/store_shots.py`. Run it again after the look changes.
- The privacy answers below, matching https://garni.page/privacy.html.
- `.github/workflows/release.yml` builds the signed Android App Bundle once the upload key is set up.

What only you can do: open the developer accounts, make the signing key, and press Submit.

---

## Google Play

### 1. Developer account
https://play.google.com/console/signup. It costs $25 once. Choose **Personal** unless you have a registered
business with a D-U-N-S number. Google checks your ID, which can take a few days.

New **personal** accounts must run a **closed test with at least 12 testers for 14 days in a row**
before Google lets the app go to production. Start finding testers early (friends, the class).

### 2. The upload key (do this once, on your computer, and keep it safe)
Google signs the app for the store; you sign uploads with your own *upload key*. Make it with the JDK's
`keytool` (it asks you to choose a password; use a password manager):

```bash
keytool -genkeypair -v -keystore garni-upload.jks -alias garni -keyalg RSA -keysize 2048 -validity 10000
```

Keep `garni-upload.jks` and its password out of the repo, backed up somewhere safe. If it's lost, Google
can reset it, but it takes days.

Then add four repository secrets on GitHub (repo › Settings › Secrets and variables › Actions):

| Secret | Value |
| --- | --- |
| `GARNI_UPLOAD_KEYSTORE_BASE64` | the output of `base64 -w0 garni-upload.jks` |
| `GARNI_KEYSTORE_PASSWORD` | the keystore password you chose |
| `GARNI_KEY_ALIAS` | `garni` |
| `GARNI_KEY_PASSWORD` | the key password (the same as the keystore one, if you pressed Enter) |

### 3. Build and upload
GitHub › Actions › **Store release (Android)** › Run workflow. Version code `1`, then 2, 3, and so on for each
upload, always higher than the last. Download the `.aab` from the run, then in Play Console: Create app ›
Testing › Closed testing › Create release › upload it.

### 4. The forms Play Console asks for
- **Store listing:** text from `listing.md`, the Android screenshots, the 512 × 512 icon
  (`web/icons/icon-512.png`), and the 1024 × 500 feature graphic (`feature-graphic.png`).
- **Data safety:** see the privacy answers below.
- **Content rating:** answer the questionnaire as in `listing.md` (Everyone).
- **Target audience:** 13 and over (Garni isn't made for children).
- **Ads:** No ads.
- **App access:** the app works without signing in. To review accounts, give Google a test login made
  for them in Admin tools (don't use your own).
- **Account deletion:** in the app (Settings › Delete my account); the web link is in `listing.md`.
- **Exact alarms:** the cooking timers use `SCHEDULE_EXACT_ALARM`, which people can switch off in
  Android settings; there's nothing to declare for it.

---

## App Store (iPhone)

### 1. Developer account
https://developer.apple.com/programs/enroll/. It costs $99 a year. Use the Apple Developer app on an iPhone to
enroll as an individual. Apple checks your ID, usually within two days.

### 2. Building for the App Store
An iPhone build has to be made on a Mac with Xcode (or a Mac in CI). There's no Mac here, so once the
account exists there are two ways:

- **On a Mac:** `npm ci && npx cap sync ios && npx cap open ios`, then in Xcode choose your team under
  Signing & Capabilities, Product › Archive, then Distribute App › App Store Connect.
- **From GitHub (no Mac needed):** make an App Store Connect API key (Users and Access › Integrations), save
  it as repository secrets, and I'll add an iOS job to `release.yml` that signs and uploads to TestFlight.

### 3. App Store Connect
My Apps › + › New App: name **Garni**, bundle id **page.garni**, primary language English (U.S.), SKU `garni`.
Then fill in the text from `listing.md`, the iPhone screenshots, and **App Privacy** (below).
Test it on TestFlight first, then Submit for Review.

### Things Apple reviews closely
- **Payments:** the app shows no Buy buttons and no links to buying on the web. Pro bought on the
  website still works in the app, which Apple allows.
- **Account deletion:** in the app, under Settings.
- **Sign-in:** email and password only, so "Sign in with Apple" isn't required.
- **Review login:** give Apple a test account (Notes for Review), like for Google.

---

## Privacy answers (both stores)

Garni has no ads, no analytics and no tracking, and doesn't sell or share data with third parties.
Data is encrypted in transit (HTTPS). People can delete their account and data in the app.

| Data | Collected? | Why | Linked to the person? |
| --- | --- | --- | --- |
| Email address | Yes, with an account | Account, sign-in emails | Yes |
| Name | Yes, with an account (the name they choose) | Shown on recipes they share | Yes |
| Photos | Optional (dish and profile photos) | App functionality | Yes |
| Other user content (recipes, notes, plans, lists, prices) | Yes, with an account | App functionality | Yes |
| Purchase history | Only if they buy Pro or tip (on the website) | Unlock Pro | Yes |
| Audio | **No.** Voice control is turned into text by the phone's own speech service and isn't sent to Garni | | |
| Location, contacts, browsing history, identifiers, diagnostics | No | | |

Apple's "Tracking": **No**. Google's "Is data shared with third parties?": **No** (the companies that
host Garni, such as Supabase and Resend, process data for Garni, which isn't "sharing" on either form).
