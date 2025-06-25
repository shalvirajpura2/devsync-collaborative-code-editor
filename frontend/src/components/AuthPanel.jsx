import React, { useState } from "react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

export default function AuthPanel() {
  const { user, loading, error, login, signup, logout } = useFirebaseAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);

  if (loading) return <div>Loading authentication...</div>;

  if (user) {
    return (
      <div style={{ margin: "1rem 0" }}>
        <p>Logged in as: <b>{user.email}</b></p>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <div style={{ margin: "1rem 0" }}>
      <h3>{isSignup ? "Sign Up" : "Login"}</h3>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ display: "block", marginBottom: 8 }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ display: "block", marginBottom: 8 }}
      />
      {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
      <button
        onClick={() => isSignup ? signup(email, password) : login(email, password)}
        style={{ marginRight: 8 }}
      >
        {isSignup ? "Sign Up" : "Login"}
      </button>
      <button onClick={() => setIsSignup(!isSignup)}>
        {isSignup ? "Have an account? Login" : "No account? Sign Up"}
      </button>
    </div>
  );
} 