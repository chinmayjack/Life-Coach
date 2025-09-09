import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();
  const [scenario, setScenario] = useState("");
  const [persona, setPersona] = useState("General Coach");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState("Unknown");
  const [allCountries, setAllCountries] = useState([]);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [upgradeDropdownOpen, setUpgradeDropdownOpen] = useState(false);
  const [file, setFile] = useState(null);

  const countryDropdownRef = useRef(null);
  const upgradeDropdownRef = useRef(null);

  useEffect(() => {
    // Fetch user's country
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => setCountry(data.country_name))
      .catch(() => setCountry("Unknown"));

    // List of countries
    setAllCountries([
      "United States",
      "Canada",
      "United Kingdom",
      "Australia",
      "India",
      "Germany",
      "France",
      "Japan",
      "China",
      "Brazil",
    ]);

    // Close dropdowns on outside click
    const handleClickOutside = (event) => {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target)
      ) {
        setCountryDropdownOpen(false);
      }
      if (
        upgradeDropdownRef.current &&
        !upgradeDropdownRef.current.contains(event.target)
      ) {
        setUpgradeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSend = async () => {
    if (!session) {
      alert("Sign in to use AI chatbot.");
      return;
    }
    setLoading(true);
    setResponse("");

    try {
      const formData = new FormData();
      formData.append("scenario", scenario);
      formData.append("persona", persona);
      formData.append("country", country);
      if (file) formData.append("file", file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResponse(data.response || data.error);
    } catch (err) {
      setResponse(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPlan = async (plan, queries) => {
    try {
      const res = await fetch("/api/set-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, queries }),
      });
      const data = await res.json();
      alert(
        `${plan === "free" ? "Free Trial" : "Premium"} activated: ${
          data.user.remainingQueries
        } queries`
      );
    } catch (err) {
      alert("Error activating plan");
    }
  };

  const handleFreeTrial = () => handleSetPlan("free", 50);
  const handleUpgrade = (amount) => {
    const queries = amount === 10 ? 100 : amount === 20 ? 200 : 300;
    handleSetPlan("premium", queries);
    setUpgradeDropdownOpen(false);
  };

  return (
    <div className="container">
      {/* Navbar */}
      <header className="navbar">
        <h1>AI Life Coach</h1>

        <div className="navbar-right">
          <button onClick={() => (window.location.href = "/")}>🏠 Home</button>
          <button onClick={handleFreeTrial}>Free Trial</button>

          {/* Upgrade Dropdown */}
          <div className="dropdown" ref={upgradeDropdownRef}>
            <button
              className="dropbtn"
              onClick={() => setUpgradeDropdownOpen(!upgradeDropdownOpen)}
            >
              Upgrade to Premium
            </button>
            <div
              className={`dropdown-content ${
                upgradeDropdownOpen ? "open" : ""
              }`}
            >
              <button onClick={() => handleUpgrade(10)}> $10 = 100 queries </button>
              <button onClick={() => handleUpgrade(20)}> $20 = 200 queries </button>
              <button onClick={() => handleUpgrade(30)}> $30 = 300 queries </button>
            </div>
          </div>

          {!session ? (
            <>
              <button onClick={() => signIn()}>Login</button>
              <button onClick={() => signIn()}>Sign Up</button>
            </>
          ) : (
            <button onClick={() => signOut()}>Logout</button>
          )}

          {/* Country Dropdown */}
          <div className="dropdown" ref={countryDropdownRef}>
            <button
              className="dropbtn"
              onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
            >
              🌐 {country}
            </button>
            <div
              className={`dropdown-content ${
                countryDropdownOpen ? "open" : ""
              }`}
            >
              {allCountries.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCountry(c);
                    setCountryDropdownOpen(false);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Hero / Chatbot */}
      <main className="hero">
        <h1>Your Personal AI Life Coach</h1>
        <p>
          Make better decisions, plan your future, and get actionable advice in
          health, finance, career, and lifestyle — powered by AI.
        </p>

        <div className="chat-card">
          {!session ? (
            <div className="signin-prompt">
              <p>Sign in to start chatting</p>
              <button onClick={() => signIn()}>Login / Sign Up</button>
            </div>
          ) : (
            <>
              <textarea
                rows={4}
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="Type your scenario..."
              />
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
              >
                <option>General Coach</option>
                <option>Fitness Coach</option>
                <option>Finance Coach</option>
                <option>Health Coach</option>
              </select>

              {/* File Upload */}
              <div className="file-upload">
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                />
                {file && <p>Selected file: {file.name}</p>}
              </div>

              {/* Buttons */}
              <div className="button-row">
                <button
                  className="send-btn"
                  onClick={handleSend}
                  disabled={loading}
                >
                  {loading ? "Analyzing..." : "Send"}
                </button>
                <button
                  className="refresh-btn"
                  onClick={() => {
                    setScenario("");
                    setResponse("");
                    setFile(null);
                  }}
                >
                  🔄 Refresh
                </button>
              </div>

              {response && <pre className="response">{response}</pre>}
            </>
          )}
        </div>
      </main>

      <footer className="footer">
        <h3>About Us</h3>
        <p>
          AI Life Coach helps busy professionals make better everyday decisions—health, finance and career—by delivering simple, actionable plans in under 60 seconds.
        </p>
      </footer>

      <style jsx>{`
        .container {
          background: linear-gradient(135deg, #4f46e5, #a855f7, #ec4899);
          min-height: 100vh;
          color: white;
          font-family: Arial, sans-serif;
        }
        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          position: sticky;
          top: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: 100;
        }
        .navbar-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .navbar-right button,
        .navbar-right .dropbtn {
          background: #7c3aed;
          color: white;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          border: none;
          cursor: pointer;
          transition: background 0.3s ease;
        }
        .navbar-right button:hover,
        .navbar-right .dropbtn:hover {
          background: #6d28d9;
        }
        .dropdown {
          position: relative;
          display: inline-block;
        }
        .dropdown-content {
          position: absolute;
          background-color: rgba(0, 0, 0, 0.8);
          min-width: 160px;
          border-radius: 6px;
          overflow: hidden;
          z-index: 100;
          display: flex;
          flex-direction: column;
          max-height: 0;
          opacity: 0;
          transition: max-height 0.3s ease, opacity 0.3s ease;
        }
        .dropdown-content.open {
          max-height: 500px;
          opacity: 1;
        }
        .dropdown-content button {
          color: white;
          padding: 12px 16px;
          text-align: left;
          background: none;
          border: none;
          width: 100%;
          cursor: pointer;
        }
        .dropdown-content button:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
        .hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0rem 2rem 2rem 2rem;
          text-align: center;
        }
        .hero h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .hero p {
          font-size: 1.2rem;
          margin-bottom: 2rem;
          max-width: 600px;
        }
        .chat-card {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(12px);
          padding: 2rem;
          border-radius: 20px;
          max-width: 500px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }
        .chat-card textarea,
        .chat-card select,
        .file-upload input {
          margin-bottom: 1rem;
          padding: 0.5rem;
          border-radius: 8px;
          border: none;
          width: 100%;
        }
        .file-upload {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .button-row {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .button-row button {
          min-width: 120px;
        }
        .send-btn {
          background: #7c3aed;
          color: white;
        }
        .send-btn:hover {
          background: #6d28d9;
        }
        .refresh-btn {
          background: #7c3aed;
          color: white;
        }
        .refresh-btn:hover {
          background: #6d28d9;
        }
        .response {
          margin-top: 1rem;
          background: rgba(0, 0, 0, 0.3);
          padding: 1rem;
          border-radius: 10px;
          white-space: pre-wrap;
        }
        .footer {
          padding: 2rem;
          text-align: center;
          background: rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}
