import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const InactivityLogout = ({ timeout }) => {
  const navigate = useNavigate();

  useEffect(() => {
    let timer;

    const resetTimer = () => {
      clearTimeout(timer);

      timer = setTimeout(() => {
        const token =
          localStorage.getItem("userToken") || localStorage.getItem("token");

        if (!token) {
          // ❗ No borres TODO el storage
          localStorage.removeItem("token");
          localStorage.removeItem("userToken");
          localStorage.removeItem("userId");
          localStorage.removeItem("userEmail");

          navigate("/login");
        }
      }, timeout);
    };

    window.onload = resetTimer;
    window.onmousemove = resetTimer;
    window.onkeypress = resetTimer;
    window.onscroll = resetTimer;

    resetTimer();

    return () => {
      clearTimeout(timer);
      window.onload = null;
      window.onmousemove = null;
      window.onkeypress = null;
      window.onscroll = null;
    };
  }, [timeout, navigate]);

  return null;
};

export default InactivityLogout;
