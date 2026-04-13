import React, { useState } from "react";

import LoginScreen from "./LoginScreen";
import SignupScreen from "./SignupScreen";

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);

  if (isLogin) {
    return <LoginScreen onSwitchToSignup={() => setIsLogin(false)} />;
  }

  return <SignupScreen onSwitchToLogin={() => setIsLogin(true)} />;
}
