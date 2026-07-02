// ============================================
// TAP — The Aesthetic Peptides
// Cloud Functions v2  |  functions/index.js
// ============================================

// ─── SECTION 1: IMPORTS ─────────────────────
const { onDocumentCreated, onDocumentUpdated } =
  require("firebase-functions/v2/firestore");
const { onSchedule } =
  require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } =
  require("firebase-functions/v2/https");
const { initializeApp } =
  require("firebase-admin/app");
const { getFirestore, FieldValue } =
  require("firebase-admin/firestore");
const { getAuth } =
  require("firebase-admin/auth");
const { Resend } = require("resend");

// ─── SECTION 2: INITIALIZATION ──────────────
initializeApp();
const db     = getFirestore();
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── SECTION 3: buildEmailBase(content) ─────
/**
 * Wraps HTML content in the TAP branded email shell.
 * All styles are inline for maximum email client compatibility.
 */
function buildEmailBase(content) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#0A0A0F">

<div style="background:#0A0A0F;padding:0;margin:0;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto">

    <!-- Header -->
    <div style="background:#C9956C;padding:32px 40px;text-align:center">
      <span style="font-family:Georgia,serif;font-size:28px;font-weight:bold;color:#ffffff;letter-spacing:0.15em">TAP</span>
      <span style="display:block;font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.8);letter-spacing:0.2em;text-transform:uppercase;margin-top:6px">The Aesthetic Peptides</span>
    </div>

    <!-- Content -->
    <div style="background:#FAF8F5;padding:40px">
      ${content}
    </div>

    <!-- Footer -->
    <div style="background:#0A0A0F;padding:24px 40px;text-align:center">
      <p style="font-family:Arial,sans-serif;font-size:11px;color:#888888;margin:0 0 8px 0">For research purposes only. Not intended for human use.</p>
      <a href="mailto:tap.aestheticpeptides@gmail.com" style="font-family:Arial,sans-serif;font-size:11px;color:#C9956C;text-decoration:none;display:block">tap.aestheticpeptides@gmail.com</a>
      <span style="font-family:Arial,sans-serif;font-size:10px;color:#555555;margin-top:8px;display:block">&copy; 2025 TAP &mdash; The Aesthetic Peptides</span>
    </div>

  </div>
</div>

</body>
</html>
  `.trim();
}

// ─── SECTION 4: buildItemsTable(items, subtotal, deliveryFee, total) ───
/**
 * Builds an HTML table of order line items with summary rows.
 */
function buildItemsTable(items, subtotal, deliveryFee, total) {
  const fmtPrice = (amount) =>
    "₱" + Number(amount || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const itemRows = (items || []).map((item, index) => {
    const rowBg    = index % 2 === 0 ? "#FAF8F5" : "#F0EDE8";
    const lineTotal = (item.price || 0) * (item.quantity || 1);
    return `
    <tr style="background:${rowBg}">
      <td style="font-family:Arial,sans-serif;font-size:13px;color:#1A1A2E;padding:10px 14px">${item.name || "—"}</td>
      <td style="font-family:Arial,sans-serif;font-size:13px;color:#1A1A2E;padding:10px 14px">${item.quantity || 1}</td>
      <td style="font-family:Arial,sans-serif;font-size:13px;color:#1A1A2E;padding:10px 14px;text-align:right">${fmtPrice(item.price)}</td>
      <td style="font-family:Arial,sans-serif;font-size:13px;color:#1A1A2E;padding:10px 14px;text-align:right">${fmtPrice(lineTotal)}</td>
    </tr>`;
  }).join("");

  const deliveryCell = deliveryFee === 0
    ? `<span style="color:#C9956C;font-weight:bold">FREE 🎉</span>`
    : fmtPrice(deliveryFee);

  return `
<table style="width:100%;border-collapse:collapse;margin:20px 0;font-family:Arial,sans-serif">
  <thead>
    <tr style="background:#1A1A2E">
      <th style="padding:10px 14px;text-align:left;color:#ffffff;font-size:12px;font-weight:bold">Product</th>
      <th style="padding:10px 14px;text-align:left;color:#ffffff;font-size:12px;font-weight:bold">Qty</th>
      <th style="padding:10px 14px;text-align:right;color:#ffffff;font-size:12px;font-weight:bold">Unit Price</th>
      <th style="padding:10px 14px;text-align:right;color:#ffffff;font-size:12px;font-weight:bold">Line Total</th>
    </tr>
  </thead>
  <tbody>
    ${itemRows}
    <tr>
      <td colspan="3" style="font-family:Arial,sans-serif;font-size:13px;color:#666666;padding:8px 14px;text-align:right">Subtotal:</td>
      <td style="font-family:Arial,sans-serif;font-size:13px;color:#1A1A2E;padding:8px 14px;text-align:right">${fmtPrice(subtotal)}</td>
    </tr>
    <tr>
      <td colspan="3" style="font-family:Arial,sans-serif;font-size:13px;color:#666666;padding:8px 14px;text-align:right">Delivery Fee:</td>
      <td style="font-family:Arial,sans-serif;font-size:13px;color:#1A1A2E;padding:8px 14px;text-align:right">${deliveryCell}</td>
    </tr>
    <tr>
      <td colspan="3" style="background:#C9956C;color:#ffffff;font-weight:bold;font-size:15px;padding:12px 14px;text-align:right">TOTAL:</td>
      <td style="background:#C9956C;color:#ffffff;font-weight:bold;font-size:15px;padding:12px 14px;text-align:right">${fmtPrice(total)}</td>
    </tr>
  </tbody>
</table>
  `.trim();
}

// ============================================
// PART 1 COMPLETE — CONTINUE FROM HERE IN 7A-2
// Next: onOrderCreated + onOrderStatusUpdated
// ============================================

// ─── FUNCTION 1: onOrderCreated ─────────────
exports.onOrderCreated = onDocumentCreated(
  "orders/{orderId}",
  async (event) => {
    const order = event.data.data();

    // ── CUSTOMER CONFIRMATION EMAIL ──────────
    const customerContent = `
      <p style="font-family:Arial;font-size:15px;color:#1A1A2E;margin-bottom:8px">
        Hello <strong>${order.customer_name}</strong>,
      </p>
      <p style="font-family:Arial;font-size:14px;color:#555555;margin-top:0">
        Your order has been received and is pending payment verification.
      </p>

      <div style="border:2px solid #C9956C;border-radius:6px;padding:20px;text-align:center;margin:24px 0">
        <span style="font-family:Arial;font-size:11px;color:#888888;letter-spacing:0.1em;text-transform:uppercase;display:block;margin-bottom:8px">ORDER ID</span>
        <span style="font-family:Georgia,serif;font-size:28px;color:#C9956C;font-weight:bold;display:block">${order.order_id}</span>
      </div>

      ${buildItemsTable(order.items, order.subtotal, order.delivery_fee, order.total)}

      <div style="margin:24px 0">
        <h3 style="font-family:Arial;font-size:14px;font-weight:bold;color:#1A1A2E;margin-bottom:8px">Delivery Address</h3>
        <p style="font-family:Arial;font-size:13px;color:#555555;line-height:1.6;margin:0">
          ${order.customer_name}<br>
          ${order.delivery_address.street}<br>
          ${order.delivery_address.barangay}<br>
          ${order.delivery_address.city}, ${order.delivery_address.province} ${order.delivery_address.zip}
        </p>
        <p style="font-family:Arial;font-size:13px;color:#555555;margin-top:8px">
          <strong>Delivery:</strong> ${order.delivery_type === "express" ? "Express (1–2 business days)" : "Standard (3–5 business days)"}
        </p>
      </div>

      <div style="background:#F0EDE8;border-left:4px solid #C9956C;border-radius:4px;padding:16px;margin:24px 0">
        <p style="font-family:Arial;font-size:13px;color:#1A1A2E;margin:0;line-height:1.8">
          ✅ Payment verification: within 2–4 hours<br>
          📦 Order dispatch: within 24 hours of verification<br>
          🔍 Track your order using Order ID: <strong>${order.order_id}</strong>
        </p>
      </div>

      <p style="font-family:Arial;font-size:11px;color:#888888;font-style:italic;margin-top:24px">
        TAP products are for research purposes only. Not intended for human use. All sales are final.
      </p>
    `;

    try {
      await resend.emails.send({
        from: "TAP Peptides <noreply@yourdomain.com>",
        to: order.customer_email,
        subject: `Your TAP Order ${order.order_id} is Confirmed 🧬`,
        html: buildEmailBase(customerContent),
      });
      console.log(`Confirmation email sent to ${order.customer_email}`);
    } catch (err) {
      console.error("Customer email error:", err);
    }

    // ── ADMIN ALERT EMAIL ────────────────────
    const adminContent = `
      <h2 style="font-family:Georgia,serif;font-size:22px;color:#1A1A2E;margin-bottom:16px">
        🛍 New Order Received!
      </h2>

      <div style="background:#F0EDE8;padding:16px;border-radius:6px;margin-bottom:20px">
        <p style="font-family:Arial;font-size:13px;color:#1A1A2E;margin:0;line-height:1.8">
          <strong>Name:</strong> ${order.customer_name}<br>
          <strong>Email:</strong> ${order.customer_email}<br>
          <strong>Phone:</strong> ${order.customer_phone}<br>
          <strong>Delivery:</strong> ${order.delivery_type}<br>
          <strong>Address:</strong> ${order.delivery_address.street}, ${order.delivery_address.barangay}, ${order.delivery_address.city}, ${order.delivery_address.province}
        </p>
      </div>

      ${buildItemsTable(order.items, order.subtotal, order.delivery_fee, order.total)}

      <p style="font-family:Arial;font-size:13px;color:#1A1A2E">
        <strong>Payment Proof:</strong>
        <a href="${order.payment_proof_url}" style="color:#C9956C">View Screenshot →</a>
      </p>

      <p style="font-family:Arial;font-size:13px;color:#1A1A2E">
        <a href="https://asthetics-d8f97.web.app/admin.html" style="color:#C9956C">Open Admin Dashboard →</a>
      </p>
    `;

    try {
      await resend.emails.send({
        from: "TAP Peptides <noreply@yourdomain.com>",
        to: process.env.ADMIN_EMAIL,
        subject: `🛍 New TAP Order ${order.order_id} — ₱${order.total.toLocaleString("en-PH")}`,
        html: buildEmailBase(adminContent),
      });
      console.log(`Admin alert sent for ${order.order_id}`);
    } catch (err) {
      console.error("Admin email error:", err);
    }
  }
);

// ─── FUNCTION 2: onOrderStatusUpdated ───────
exports.onOrderStatusUpdated = onDocumentUpdated(
  "orders/{orderId}",
  async (event) => {
    const before = event.data.before.data();
    const after  = event.data.after.data();

    let subject    = "";
    let content    = "";
    let shouldSend = false;

    // ── PAYMENT STATUS CHANGES ───────────────
    if (before.payment_status !== after.payment_status) {

      if (after.payment_status === "verified") {
        shouldSend = true;
        subject    = "✅ Payment Confirmed — We're Preparing Your Order!";
        content    = `
          <h2 style="font-family:Georgia,serif;font-size:20px;color:#C9956C;margin-bottom:16px">
            Great news!
          </h2>
          <p style="font-family:Arial;font-size:14px;color:#1A1A2E;line-height:1.6">
            Your GCash payment for <strong>${after.order_id}</strong> has been verified.
          </p>
          <p style="font-family:Arial;font-size:14px;color:#1A1A2E;line-height:1.6">
            Your order is now being prepared for dispatch.
          </p>
          <div style="background:#F0EDE8;border-left:4px solid #C9956C;border-radius:4px;padding:16px;margin:24px 0">
            <p style="font-family:Arial;font-size:13px;color:#1A1A2E;margin:0">
              📦 Expected dispatch: within 24 hours<br>
              🔍 Track using Order ID: <strong>${after.order_id}</strong>
            </p>
          </div>
        `;
      }

      if (after.payment_status === "rejected") {
        shouldSend = true;
        subject    = "⚠️ Payment Not Verified — Action Required";
        content    = `
          <h2 style="font-family:Georgia,serif;font-size:20px;color:#EF4444;margin-bottom:16px">
            Payment Not Verified
          </h2>
          <p style="font-family:Arial;font-size:14px;color:#1A1A2E;line-height:1.6">
            We were unable to verify your GCash payment for <strong>${after.order_id}</strong>.
          </p>
          <p style="font-family:Arial;font-size:14px;color:#1A1A2E">Steps to resolve:</p>
          <ol style="font-family:Arial;font-size:13px;color:#555555;line-height:1.8">
            <li>Visit our website and go to Track Order</li>
            <li>Re-upload a clear screenshot of your GCash transaction</li>
            <li>Ensure the amount matches your order total</li>
            <li>Contact us if the issue persists</li>
          </ol>
          <div style="background:#F0EDE8;border-left:4px solid #C9956C;border-radius:4px;padding:16px;margin:24px 0">
            <p style="font-family:Arial;font-size:13px;color:#1A1A2E;margin:0">
              📧 tap.aestheticpeptides@gmail.com<br>
              💬 Facebook: @TAPeptidesPH
            </p>
          </div>
        `;
      }
    }

    // ── ORDER STATUS CHANGES ─────────────────
    if (before.order_status !== after.order_status) {

      if (after.order_status === "processing") {
        shouldSend = true;
        subject    = "🔬 Your TAP Order is Being Prepared";
        content    = `
          <h2 style="font-family:Georgia,serif;font-size:20px;color:#1A1A2E;margin-bottom:16px">
            Order In Progress
          </h2>
          <p style="font-family:Arial;font-size:14px;color:#1A1A2E;line-height:1.6">
            Your order <strong>${after.order_id}</strong> is now being carefully prepared and quality-checked.
          </p>
          <p style="font-family:Arial;font-size:14px;color:#555555">
            We will notify you as soon as it ships.
          </p>
        `;
      }

      if (after.order_status === "shipped") {
        shouldSend = true;
        subject    = "📦 Your TAP Order Has Shipped!";

        const trackingBlock = after.tracking_number
          ? `
            <div style="border:2px solid #C9956C;border-radius:6px;padding:20px;text-align:center;margin:20px 0">
              <span style="font-family:Arial;font-size:11px;color:#888888;letter-spacing:0.1em;text-transform:uppercase;display:block;margin-bottom:6px">TRACKING NUMBER</span>
              <span style="font-family:Georgia,serif;font-size:22px;color:#C9956C;font-weight:bold;display:block">${after.tracking_number}</span>
              <span style="font-family:Arial;font-size:12px;color:#555555;display:block;margin-top:8px">Track via J&amp;T Express, LBC, or Ninja Van</span>
            </div>`
          : "";

        content = `
          <h2 style="font-family:Georgia,serif;font-size:20px;color:#C9956C;margin-bottom:16px">
            Your order is on its way! 🚚
          </h2>
          <p style="font-family:Arial;font-size:14px;color:#1A1A2E;line-height:1.6">
            Order <strong>${after.order_id}</strong> has been dispatched.
          </p>
          ${trackingBlock}
          <p style="font-family:Arial;font-size:13px;color:#555555">
            Estimated arrival: ${after.delivery_type === "express" ? "1–2 business days" : "3–5 business days"}<br>
            Please ensure someone is available to receive the package.
          </p>
        `;
      }

      if (after.order_status === "delivered") {
        shouldSend = true;
        subject    = "✅ Order Delivered — How Was It?";
        content    = `
          <h2 style="font-family:Georgia,serif;font-size:20px;color:#C9956C;margin-bottom:16px">
            Your order has been delivered! ✅
          </h2>
          <p style="font-family:Arial;font-size:14px;color:#1A1A2E;line-height:1.6">
            We hope you are happy with your TAP peptides.
          </p>
          <p style="font-family:Arial;font-size:14px;color:#555555">
            We would love your feedback — message us on Facebook @TAPeptidesPH.
          </p>
          <p style="text-align:center;margin:28px 0">
            <a href="https://asthetics-d8f97.web.app" style="background:#C9956C;color:white;padding:12px 28px;text-decoration:none;border-radius:4px;font-family:Arial;font-size:14px;display:inline-block">
              Shop Again →
            </a>
          </p>
        `;
      }

      if (after.order_status === "cancelled") {
        shouldSend = true;
        subject    = "Your TAP Order Has Been Cancelled";
        content    = `
          <h2 style="font-family:Georgia,serif;font-size:20px;color:#EF4444;margin-bottom:16px">
            Order Cancelled
          </h2>
          <p style="font-family:Arial;font-size:14px;color:#1A1A2E;line-height:1.6">
            Order <strong>${after.order_id}</strong> has been cancelled.
          </p>
          <p style="font-family:Arial;font-size:14px;color:#555555">
            Reason: ${after.cancellation_reason || "Please contact us for details"}
          </p>
          <p style="font-family:Arial;font-size:14px;color:#1A1A2E">
            If you believe this is an error, please contact us immediately.
          </p>
          <div style="background:#F0EDE8;border-left:4px solid #C9956C;border-radius:4px;padding:16px;margin:24px 0">
            <p style="font-family:Arial;font-size:13px;color:#1A1A2E;margin:0">
              📧 tap.aestheticpeptides@gmail.com<br>
              💬 Facebook: @TAPeptidesPH
            </p>
          </div>
        `;
      }
    }

    if (shouldSend) {
      try {
        await resend.emails.send({
          from: "TAP Peptides <noreply@yourdomain.com>",
          to: after.customer_email,
          subject,
          html: buildEmailBase(content),
        });
        console.log(`Status email sent: ${subject}`);
      } catch (err) {
        console.error("Status update email error:", err);
      }
    }
  }
);

// ============================================
// PART 2 COMPLETE — CONTINUE FROM HERE IN 7A-3
// Next: setAdminClaim + cleanupAbandonedOrders
// ============================================

// ─── FUNCTION 3: setAdminClaim ──────────────
exports.setAdminClaim = onCall(async (request) => {
  const secret = request.rawRequest.headers["x-admin-secret"];
  if (secret !== process.env.ADMIN_SECRET) {
    throw new HttpsError(
      "permission-denied",
      "Invalid admin secret"
    );
  }

  const { email } = request.data;
  if (!email) {
    throw new HttpsError(
      "invalid-argument",
      "Email is required"
    );
  }

  try {
    const user = await getAuth().getUserByEmail(email);
    await getAuth().setCustomUserClaims(user.uid, { admin: true });

    await db.collection("admin_logs").add({
      action:       "set_admin_claim",
      target_email: email,
      target_uid:   user.uid,
      timestamp:    FieldValue.serverTimestamp(),
      ip:           request.rawRequest.ip || "unknown",
    });

    await db.doc("config/admins").set({
      emails:     FieldValue.arrayUnion(email),
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`Admin claim granted to ${email}`);
    return { success: true, email };
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      throw new HttpsError(
        "not-found",
        `No user found with email: ${email}. User must sign in to the site at least once first.`
      );
    }
    throw new HttpsError("internal", error.message);
  }
});

// ─── FUNCTION 4: cleanupAbandonedOrders ─────
exports.cleanupAbandonedOrders = onSchedule({
  schedule: "0 2 * * *",
  timeZone: "Asia/Manila",
}, async (event) => {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const snapshot = await db
    .collection("orders")
    .where("payment_status", "==", "pending")
    .where("created_at", "<", cutoff)
    .get();

  if (snapshot.empty) {
    console.log("Cleanup: No abandoned orders found.");
    return;
  }

  const batch = db.batch();
  let count = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();

    // Skip orders that are already in a terminal state
    if (["cancelled", "delivered", "shipped"].includes(data.order_status)) return;

    batch.update(doc.ref, {
      order_status:         "cancelled",
      payment_status:       "rejected",
      updated_at:           FieldValue.serverTimestamp(),
      cancellation_reason:  "Auto-cancelled: payment not received within 48 hours",
    });

    const historyRef = doc.ref.collection("order_status_history").doc();
    batch.set(historyRef, {
      changed_at: FieldValue.serverTimestamp(),
      changed_by: "system@tap-auto",
      field:      "order_status",
      old_value:  data.order_status,
      new_value:  "cancelled",
      note:       "Auto-cancelled by scheduled cleanup function",
    });

    count++;
  });

  await batch.commit();
  console.log(`Cleanup complete. Cancelled ${count} abandoned orders.`);
});

// ============================================
// functions/index.js COMPLETE
// ============================================
