# TAP — The Aesthetic Peptides

Premium research peptide e-commerce platform for the Philippine market.
Single-file storefront + admin dashboard, powered by Firebase.

---

## Project Structure

```
TAP/
├── index.html              # Storefront (public)
├── admin.html              # Admin dashboard (NOT linked from index.html)
├── firebase.json           # Firebase Hosting + Functions + Rules config
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Composite index definitions
├── storage.rules           # Firebase Storage security rules
├── .env.example            # Environment variable template
└── functions/
    ├── index.js            # Cloud Functions (email triggers, admin claim, cleanup)
    └── package.json        # Functions dependencies
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS, single HTML file, no build step |
| Database | Firebase Firestore |
| Auth | Firebase Authentication (Google Sign-In for customers, Email/Password for admin) |
| Storage | Firebase Storage (product images, payment proofs) |
| Functions | Firebase Cloud Functions v2 (Node 18) |
| Email | Resend |
| Payments | GCash QR (static, no API) |
| Hosting | Firebase Hosting |

---

## Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- A [Firebase project](https://console.firebase.google.com/) with **Blaze (pay-as-you-go)** plan
- A [Resend](https://resend.com) account with a verified sending domain

---

## Setup — Step by Step

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd TAP
cd functions && npm install && cd ..
```

### 2. Create Your Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (e.g. `tap-peptides`)
3. Enable **Authentication** → Sign-in methods:
   - Google (for customers)
   - Email/Password (for admin)
4. Enable **Firestore Database** (start in production mode)
5. Enable **Storage** (start in production mode)
6. Enable **Functions** (requires Blaze plan)

### 3. Register Your Web App

1. In Firebase Console → Project Settings → Your apps → Add app → Web
2. Copy the config object
3. Paste the values into `index.html` and `admin.html`,
   replacing every `YOUR_XXXX` placeholder:

```javascript
const firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "tap-peptides.firebaseapp.com",
  projectId:         "tap-peptides",
  storageBucket:     "tap-peptides.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc..."
};
```

### 4. Set Environment Variables (Secrets)

```bash
# Set each secret — Firebase will prompt you to enter the value
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set ADMIN_EMAIL
firebase functions:secrets:set ADMIN_SECRET
```

See `.env.example` for descriptions of each variable.

For **local emulator development**, create `functions/.env` (this file is gitignored):

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
ADMIN_EMAIL=your@email.com
ADMIN_SECRET=your-secret-string
```

### 5. Link Firebase CLI to Your Project

```bash
firebase login
firebase use --add
# Select your project and give it an alias, e.g. "default"
```

### 6. Deploy Firestore Rules + Indexes

```bash
firebase deploy --only firestore
```

### 7. Deploy Storage Rules

```bash
firebase deploy --only storage
```

### 8. Deploy Cloud Functions

```bash
firebase deploy --only functions
```

### 9. Deploy Hosting

```bash
firebase deploy --only hosting
```

### 10. Deploy Everything at Once

```bash
firebase deploy
```

---

## Grant Admin Access

Admin login (`admin.html`) requires a Firebase custom claim `{ admin: true }`.
To grant admin access to a user:

**Option A — via curl (after deploying functions):**

```bash
curl -X POST \
  https://<region>-<project-id>.cloudfunctions.net/setAdminClaim \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{"data": {"email": "admin@example.com"}}'
```

**Option B — via Firebase Admin SDK script:**

```javascript
// run-once script (Node.js)
const admin = require('firebase-admin');
admin.initializeApp();
admin.auth()
  .getUserByEmail('admin@example.com')
  .then(user => admin.auth().setCustomUserClaims(user.uid, { admin: true }))
  .then(() => console.log('Admin claim set.'));
```

> **Note:** The user must have signed in to the site at least once before you can set their claim.
> After setting the claim, the user must sign out and sign back in for the token to refresh.

---

## Replace Placeholder Content Before Launch

Search for these strings in `index.html` and `admin.html` and replace them:

| Placeholder | Replace with |
|---|---|
| `YOUR_GCASH_QR_IMAGE.png` | Path or URL to your GCash QR code image |
| `09XX-XXX-XXXX` | Your GCash number |
| `+63XXXXXXXXXX` | Your Viber number |
| `YOUR_ADMIN_URL` | Your deployed Firebase Hosting URL |
| `YOUR_STORE_URL` | Your deployed storefront URL |

In `functions/index.js`:

| Placeholder | Replace with |
|---|---|
| `noreply@yourdomain.com` | Your Resend-verified sender address |

---

## Local Development (Emulator)

```bash
# Start all emulators
firebase emulators:start

# Emulator UI:  http://localhost:4000
# Storefront:   http://localhost:5000
# Functions:    http://localhost:5001
# Firestore:    http://localhost:8080
# Storage:      http://localhost:9199
# Auth:         http://localhost:9099
```

---

## Cloud Functions Reference

| Function | Trigger | Description |
|---|---|---|
| `onOrderCreated` | Firestore write `/orders/{id}` | Sends customer confirmation + admin alert email |
| `onOrderStatusUpdated` | Firestore update `/orders/{id}` | Sends status-change emails (payment verified/rejected, processing, shipped, delivered, cancelled) |
| `setAdminClaim` | HTTPS callable | Grants `{ admin: true }` custom claim to a user by email. Requires `x-admin-secret` header. |
| `cleanupAbandonedOrders` | Schedule: daily 2 AM Manila | Auto-cancels orders with `payment_status == pending` older than 48 hours. Writes history entries. |

---

## Firestore Data Model

```
/orders/{orderId}
  order_id            string      TAP-XXXXXX
  customer_name       string
  customer_email      string
  customer_phone      string
  delivery_address    map         { street, barangay, city, province, zip }
  delivery_type       string      "standard" | "express"
  delivery_fee        number      0 | 150 | 300
  items               array       [{ name, category, price, quantity }]
  subtotal            number
  total               number
  payment_status      string      "pending" | "verified" | "rejected"
  order_status        string      "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled"
  payment_proof_url   string      Firebase Storage URL
  tracking_number     string      (optional)
  notes               string      Customer notes
  admin_notes         string      Admin-only, never shown to customer
  cancellation_reason string      (optional)
  created_at          timestamp
  updated_at          timestamp

/orders/{orderId}/order_status_history/{historyId}
  field       string
  old_value   string
  new_value   string
  changed_by  string    admin email or "system@tap-auto"
  changed_at  timestamp
  note        string    (optional)

/products/{productId}
  name            string
  category        string    "Recovery" | "Weight Management" | "Skin" | "Anti-Aging" | "Aesthetic" | "Supplies"
  description     string
  price           number
  stock           number
  image_url       string    Firebase Storage URL
  is_new_arrival  boolean
  is_active       boolean
  created_at      timestamp
  updated_at      timestamp

/config/store
  gcash_number              string
  gcash_name                string
  free_shipping_threshold   number    default 2500
  admin_email               string
  support_email             string
  updated_at                timestamp

/config/admins
  emails      array     list of admin email addresses
  updated_at  timestamp

/admin_logs/{logId}
  action        string
  target_email  string
  target_uid    string
  timestamp     timestamp
  ip            string
```

---

## Storage Structure

```
/product-images/{productId}     Product photo (public read)
/payment-proofs/{orderId}/{filename}   Customer GCash screenshot (admin read only)
```

---

## Security Notes

- `admin.html` is **not linked** from `index.html` — keep it that way
- Admin access requires a Firebase custom claim (`admin: true`) — not just any authenticated user
- All customer writes to Firestore are validated by security rules (correct email, pending-only status, required fields)
- Payment proofs are write-once for customers — only admins can overwrite or delete
- Cloud Function secrets (`RESEND_API_KEY`, `ADMIN_EMAIL`, `ADMIN_SECRET`) are stored in Firebase Secret Manager — never in source code
- The `ADMIN_SECRET` header protects the `setAdminClaim` function from unauthorized access

---

## Go-Live Checklist

- [ ] Firebase config values pasted into `index.html` and `admin.html`
- [ ] GCash QR image uploaded and path updated in `index.html`
- [ ] GCash number and Viber number updated in `index.html`
- [ ] Resend domain verified and `noreply@yourdomain.com` updated in `functions/index.js`
- [ ] `YOUR_ADMIN_URL` and `YOUR_STORE_URL` updated in `functions/index.js`
- [ ] Environment secrets set via `firebase functions:secrets:set`
- [ ] `firebase deploy` run successfully
- [ ] At least one admin user granted the admin claim
- [ ] Test order placed end-to-end (add to cart → checkout → GCash → upload proof → confirmation email)
- [ ] Admin dashboard accessed at `/admin.html` and order status updated
- [ ] Status-change email received by customer after admin update
- [ ] Firestore rules tested in Firebase Console Rules Playground
- [ ] `admin.html` confirmed to return 403/noindex for non-admin users

---

## Support

For questions or issues, open an issue in the project repository
or contact the development team.

*TAP — The Aesthetic Peptides. For research purposes only.*
