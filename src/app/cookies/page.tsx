import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function CookiesPage() {
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
            Cookie Policy
          </h1>
          <div className="space-y-6 text-sm leading-relaxed" style={{ color: "#4A4845", fontWeight: 300 }}>
            <p>Last updated: April 2025</p>
            <p>
              Atmava uses cookies and similar tracking technologies to enhance your experience on our platform.
            </p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#2C2B29", fontWeight: 400 }}>
              What Are Cookies
            </h2>
            <p>
              Cookies are small data files placed on your device when you visit a website. They help us remember your preferences and understand how you use our services.
            </p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#2C2B29", fontWeight: 400 }}>
              How We Use Cookies
            </h2>
            <p>
              We use essential cookies to keep you signed in and maintain your session. We may also use analytics cookies to understand usage patterns and improve the platform. We do not use advertising cookies.
            </p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#2C2B29", fontWeight: 400 }}>
              Managing Cookies
            </h2>
            <p>
              You can control cookies through your browser settings. Note that disabling certain cookies may affect the functionality of the platform, including your ability to stay signed in.
            </p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#2C2B29", fontWeight: 400 }}>
              Contact
            </h2>
            <p>
              Questions about cookies? Contact us at{" "}
              <a href="mailto:info@atmava.com" style={{ color: "#5C6B57" }}>info@atmava.com</a>.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
