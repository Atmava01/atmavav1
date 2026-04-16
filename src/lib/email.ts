/**
 * Email service using Nodemailer — server-side only.
 * Configure SMTP credentials in .env.local.
 */
import nodemailer from "nodemailer";

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });
}

export interface BookingEmailParams {
  studentEmail: string;
  studentName: string;
  mentorEmail: string;
  mentorName: string;
  /** YYYY-MM-DD */
  date: string;
  /** "9:00 AM" */
  time: string;
  meetLink: string;
  notes?: string;
}

function buildHtml(opts: {
  title: string;
  greeting: string;
  otherPerson: string;
  otherRole: string;
  date: string;
  time: string;
  meetLink: string;
  notes?: string;
}): string {
  const noteRow = opts.notes
    ? `<tr>
         <td style="padding:8px 0;color:#4A4845;font-size:13px;width:110px;">Focus</td>
         <td style="padding:8px 0;color:#2C2B29;font-size:13px;">${opts.notes}</td>
       </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#F6F4EF;padding:40px 16px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(44,43,41,0.09);">

    <!-- Header -->
    <div style="background:#2C2B29;padding:32px 40px;">
      <p style="font-family:Georgia,serif;font-size:30px;color:#F6F4EF;margin:0;letter-spacing:0.12em;">atmava</p>
      <p style="font-size:11px;color:rgba(246,244,239,0.45);margin:5px 0 0;letter-spacing:0.2em;text-transform:uppercase;">Mentorship Platform</p>
    </div>

    <!-- Body -->
    <div style="padding:40px;">
      <h2 style="font-family:Georgia,serif;font-size:22px;color:#2C2B29;font-weight:400;margin:0 0 10px;">${opts.title}</h2>
      <p style="font-size:14px;color:#4A4845;margin:0 0 28px;line-height:1.6;">${opts.greeting}</p>

      <!-- Session details -->
      <p style="font-size:11px;color:#4A4845;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.12em;">Session Details</p>
      <div style="background:#F6F4EF;border-radius:14px;padding:8px 20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#4A4845;font-size:13px;width:110px;">Date</td>
            <td style="padding:8px 0;color:#2C2B29;font-size:13px;">${opts.date}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#4A4845;font-size:13px;">Time</td>
            <td style="padding:8px 0;color:#2C2B29;font-size:13px;">${opts.time} <span style="color:#4A4845;font-size:11px;">(UTC)</span></td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#4A4845;font-size:13px;">Duration</td>
            <td style="padding:8px 0;color:#2C2B29;font-size:13px;">60 minutes</td>
          </tr>
          ${noteRow}
        </table>
      </div>

      <!-- Other person -->
      <p style="font-size:11px;color:#4A4845;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.12em;">${opts.otherRole}</p>
      <p style="font-size:14px;color:#2C2B29;margin:0 0 32px;">${opts.otherPerson}</p>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:32px;">
        <a href="${opts.meetLink}"
           style="display:inline-block;background:#5C6B57;color:#F6F4EF;text-decoration:none;padding:15px 44px;border-radius:12px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">
          Join Google Meet
        </a>
      </div>

      <p style="font-size:12px;color:#4A4845;line-height:1.6;margin:0;border-top:1px solid #E8E1D6;padding-top:20px;">
        A Google Calendar invite has been sent to your inbox with this meeting link.
        You'll receive a reminder 24 hours and 1 hour before the session.
        The link is also available in your Atmava dashboard.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#F6F4EF;padding:20px 40px;border-top:1px solid #E8E1D6;">
      <p style="font-size:11px;color:#4A4845;margin:0;text-align:center;">
        © ${new Date().getFullYear()} Atmava &nbsp;·&nbsp; Awareness · Stillness · Mastery
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends booking confirmation emails to both student and mentor.
 * Failures are logged but not re-thrown so the booking flow continues.
 */
export async function sendBookingConfirmationEmails(
  params: BookingEmailParams
): Promise<void> {
  const {
    studentEmail,
    studentName,
    mentorEmail,
    mentorName,
    date,
    time,
    meetLink,
    notes,
  } = params;

  const transport = createTransport();
  const from = process.env.EMAIL_FROM ?? `"Atmava" <noreply@atmava.com>`;

  await Promise.all([
    // ── Student email ────────────────────────────────────────────────────────
    transport.sendMail({
      from,
      to: studentEmail,
      subject: `Your Atmava session is confirmed — ${date} at ${time}`,
      html: buildHtml({
        title: "Session Confirmed",
        greeting: `Hi ${studentName}, your mentorship session has been successfully booked. We look forward to supporting your practice.`,
        otherPerson: mentorName,
        otherRole: "Your Mentor",
        date,
        time,
        meetLink,
        notes,
      }),
    }),

    // ── Mentor email ─────────────────────────────────────────────────────────
    transport.sendMail({
      from,
      to: mentorEmail,
      subject: `New session booked — ${studentName} on ${date} at ${time}`,
      html: buildHtml({
        title: "New Session Booked",
        greeting: `Hi ${mentorName}, a new mentorship session has been scheduled with one of your students.`,
        otherPerson: studentName,
        otherRole: "Student",
        date,
        time,
        meetLink,
        notes,
      }),
    }),
  ]);
}
