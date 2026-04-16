import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function TermsPage() {
  return (
    <main>
      <Navbar />
      <section className="pt-40 pb-32 px-6" style={{ background: "#F6F4EF" }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.28em] uppercase mb-4" style={{ color: "#5C6B57" }}>Legal</p>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              fontWeight: 300,
              color: "#2C2B29",
              marginBottom: "2.5rem",
              lineHeight: 1.15,
            }}
          >
            Terms of Service
          </h1>
          <div className="space-y-6 text-sm leading-relaxed" style={{ color: "#4A4845", fontWeight: 300 }}>
            <p>Last updated: April 2025</p>
            <p>
              By accessing or using Atmava's services, you agree to be bound by these Terms of Service. Please read them carefully.
            </p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#2C2B29", fontWeight: 400 }}>
              Use of Services
            </h2>
            <p>
              Atmava programs are intended for personal use only. You may not share your account credentials or access with others. Program content is for enrolled participants only.
            </p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#2C2B29", fontWeight: 400 }}>
              Payments & Enrollment
            </h2>
            <p>
              All program fees are collected in INR via Razorpay. Enrollment is confirmed upon successful payment. Please review our refund policy or contact info@atmava.com within 48 hours of enrollment for any concerns.
            </p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#2C2B29", fontWeight: 400 }}>
              Conduct
            </h2>
            <p>
              Participants are expected to engage respectfully with mentors and fellow participants. Atmava reserves the right to remove any participant who violates our community standards.
            </p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#2C2B29", fontWeight: 400 }}>
              Contact
            </h2>
            <p>
              For questions regarding these Terms, contact us at{" "}
              <a href="mailto:info@atmava.com" style={{ color: "#5C6B57" }}>info@atmava.com</a>.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
