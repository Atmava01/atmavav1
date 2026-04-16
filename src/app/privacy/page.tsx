import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <div className="space-y-6 text-sm leading-relaxed" style={{ color: "#4A4845", fontWeight: 300 }}>
            <p>Last updated: April 2025</p>
            <p>
              Atmava ("we", "us", "our") is committed to protecting your personal information and your right to privacy. This Privacy Policy describes how we collect, use, and share information about you when you use our services.
            </p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#2C2B29", fontWeight: 400 }}>
              Information We Collect
            </h2>
            <p>
              We collect information you provide directly to us, such as your name, email address, and payment information when you create an account or enroll in a program. We also collect usage data and session logs to improve our services.
            </p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#2C2B29", fontWeight: 400 }}>
              How We Use Your Information
            </h2>
            <p>
              We use the information we collect to provide, maintain, and improve our services; process transactions; send program-related communications; and comply with legal obligations.
            </p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#2C2B29", fontWeight: 400 }}>
              Data Security
            </h2>
            <p>
              We take reasonable measures to protect your personal information. Payment data is processed by Razorpay and is not stored on our servers.
            </p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#2C2B29", fontWeight: 400 }}>
              Contact
            </h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:info@atmava.com" style={{ color: "#5C6B57" }}>info@atmava.com</a>.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
