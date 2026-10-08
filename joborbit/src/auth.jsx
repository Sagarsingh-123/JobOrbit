import { useState } from "react";
import { API } from "./api";

function Auth({ onLogin, onClose, adminMode = false }) {
  const [isLogin, setIsLogin] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");
    setLoading(true);

    // 15 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 15000);

    try {
      // =========================
      // LOGIN
      // =========================

      if (isLogin) {
        const response = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
          signal: controller.signal,
        });

        const contentType =
          response.headers.get("content-type") || "";

        let data;

        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();

          throw new Error(
            text || "Server ne valid response nahi diya."
          );
        }

        if (!response.ok) {
          throw new Error(
            data?.message || "Login failed"
          );
        }

        // User object check
        if (!data?.user) {
          throw new Error(
            "Server response me user information nahi mili."
          );
        }

        // =========================
        // NORMAL LOGIN
        // =========================

        if (!adminMode && data.user.role === "admin") {
          throw new Error(
            "Admin account ke liye Admin Login use karo."
          );
        }

        // =========================
        // ADMIN LOGIN
        // =========================

        if (adminMode && data.user.role !== "admin") {
          throw new Error(
            "Ye account admin account nahi hai."
          );
        }

        // Token check
        if (!data?.token) {
          throw new Error(
            "Login successful nahi hua: token nahi mila."
          );
        }

        localStorage.setItem(
          "joborbit_token",
          data.token
        );

        localStorage.setItem(
          "joborbit_user",
          JSON.stringify(data.user)
        );

        // Admin / User ko App.jsx handle karega
        if (onLogin) {
          onLogin(data.user);
        }

        return;
      }

      // =========================
      // SIGNUP
      // =========================

      if (adminMode) {
        throw new Error(
          "Admin account create nahi kiya ja sakta."
        );
      }

      if (!name.trim()) {
        throw new Error("Name enter karo.");
      }

      if (!email.trim()) {
        throw new Error("Email enter karo.");
      }

      if (!password || password.length < 6) {
        throw new Error(
          "Password kam se kam 6 characters ka hona chahiye."
        );
      }

      const signupResponse = await fetch(
        `${API}/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
          }),
          signal: controller.signal,
        }
      );

      const signupContentType =
        signupResponse.headers.get("content-type") || "";

      let signupData;

      if (
        signupContentType.includes("application/json")
      ) {
        signupData = await signupResponse.json();
      } else {
        const text = await signupResponse.text();

        throw new Error(
          text || "Server ne valid signup response nahi diya."
        );
      }

      if (!signupResponse.ok) {
        throw new Error(
          signupData?.message || "Signup failed"
        );
      }

      // =========================
      // SIGNUP KE BAAD
      // AUTOMATIC LOGIN
      // =========================

      const loginResponse = await fetch(
        `${API}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
          signal: controller.signal,
        }
      );

      const loginContentType =
        loginResponse.headers.get("content-type") || "";

      let loginData;

      if (
        loginContentType.includes("application/json")
      ) {
        loginData = await loginResponse.json();
      } else {
        const text = await loginResponse.text();

        throw new Error(
          text ||
            "Account create ho gaya, lekin login response invalid hai."
        );
      }

      if (!loginResponse.ok) {
        throw new Error(
          loginData?.message ||
            "Account create ho gaya, lekin login nahi ho paaya."
        );
      }

      if (!loginData?.user || !loginData?.token) {
        throw new Error(
          "Account create ho gaya, lekin login data incomplete hai."
        );
      }

      localStorage.setItem(
        "joborbit_token",
        loginData.token
      );

      localStorage.setItem(
        "joborbit_user",
        JSON.stringify(loginData.user)
      );

      if (onLogin) {
        onLogin(loginData.user);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setError(
          "Server response nahi de raha. Backend check karo."
        );
      } else {
        setError(
          err.message || "Something went wrong."
        );
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background:
          "linear-gradient(135deg, #eef3ff, #f7f9fc)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "#fff",
          borderRadius: "18px",
          padding: "30px",
          boxSizing: "border-box",
          boxShadow:
            "0 15px 45px rgba(30, 50, 90, 0.12)",
          border: "1px solid #e3e8f0",
          position: "relative",
        }}
      >
        {/* CLOSE BUTTON */}

        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          style={{
            position: "absolute",
            right: "15px",
            top: "12px",
            border: "none",
            background: "transparent",
            fontSize: "24px",
            color: "#66738b",
            cursor: loading
              ? "not-allowed"
              : "pointer",
          }}
        >
          ×
        </button>

        {/* LOGO */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "8px",
          }}
        >
          <h1
            style={{
              margin: 0,
              color: "#17233b",
              fontSize: "28px",
            }}
          >
            Job
            <span style={{ color: "#315ee8" }}>
              Orbit
            </span>
            .
          </h1>
        </div>

        {/* TITLE */}

        <h2
          style={{
            textAlign: "center",
            margin: "10px 0 6px",
            color: "#17233b",
          }}
        >
          {adminMode
            ? "Admin Login"
            : isLogin
            ? "Welcome Back"
            : "Create Account"}
        </h2>

        <p
          style={{
            textAlign: "center",
            color: "#66738b",
            marginTop: 0,
            marginBottom: "24px",
            fontSize: "14px",
          }}
        >
          {adminMode
            ? "Login to access Admin Dashboard"
            : isLogin
            ? "Login to continue your job search"
            : "Create your JobOrbit account"}
        </p>

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: "14px",
          }}
        >
          {/* NAME */}

          {!isLogin && !adminMode && (
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  color: "#17233b",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Full Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Enter your name"
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d6dce8",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                  fontSize: "15px",
                  outline: "none",
                }}
              />
            </div>
          )}

          {/* EMAIL */}

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                color: "#17233b",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Enter your email"
              required
              autoComplete="email"
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #d6dce8",
                borderRadius: "8px",
                boxSizing: "border-box",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </div>

          {/* PASSWORD */}

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                color: "#17233b",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter password"
              required
              minLength={6}
              autoComplete={
                isLogin
                  ? "current-password"
                  : "new-password"
              }
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #d6dce8",
                borderRadius: "8px",
                boxSizing: "border-box",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </div>

          {/* ERROR */}

          {error && (
            <div
              style={{
                padding: "11px",
                borderRadius: "8px",
                background: "#fdecec",
                color: "#c62828",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            >
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div
              style={{
                padding: "11px",
                borderRadius: "8px",
                background: "#e8f8ef",
                color: "#237448",
                fontSize: "14px",
              }}
            >
              {success}
            </div>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              border: "none",
              borderRadius: "9px",
              background: loading
                ? "#8ca4ed"
                : "#315ee8",
              color: "#fff",
              fontSize: "15px",
              fontWeight: "700",
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Please wait..."
              : adminMode
              ? "Admin Login"
              : isLogin
              ? "Login"
              : "Create Account"}
          </button>
        </form>

        {/* SWITCH LOGIN / SIGNUP */}

        {!adminMode && (
          <div
            style={{
              textAlign: "center",
              marginTop: "20px",
              color: "#66738b",
              fontSize: "14px",
            }}
          >
            {isLogin ? (
              <>
                Account nahi hai?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setError("");
                    setSuccess("");
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#315ee8",
                    fontWeight: "700",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Create Account
                </button>
              </>
            ) : (
              <>
                Already account hai?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setError("");
                    setSuccess("");
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#315ee8",
                    fontWeight: "700",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Login
                </button>
              </>
            )}
          </div>
        )}

        {/* ADMIN MODE MESSAGE */}

        {adminMode && (
          <div
            style={{
              marginTop: "18px",
              padding: "11px",
              borderRadius: "8px",
              background: "#fff7df",
              color: "#946200",
              fontSize: "13px",
              textAlign: "center",
            }}
          >
            Sirf existing admin account se login
            karein.
          </div>
        )}
      </div>
    </div>
  );
}

export default Auth;