import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

/* ================================
   Robust API resolver (production safe)
================================== */
const ENV_API =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL)) ||
  "";

const API =
  ENV_API && ENV_API.startsWith("http")
    ? ENV_API.replace(/\/$/, "")
    : "https://merqnet-backend-production.up.railway.app";

/* ================================
   Component
================================== */
export default function EditProfile() {
  const navigate = useNavigate();

  const token =
    localStorage.getItem("userToken") || localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    acceptsInternationalTrade: false,
    shippingAddresses: [],
  });

  /* ================================
     Load user
  ================================== */
  useEffect(() => {
    if (!token || !userId) {
      setLoading(false);
      navigate("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await axios.get(`${API}/api/users/profile/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const user = res.data;

        setFormData({
          fullName: user.fullName || "",
          email: user.email || "",
          phone: user.phone || "",
          acceptsInternationalTrade: !!user.acceptsInternationalTrade,
          shippingAddresses: user.shippingAddresses || [],
        });
      } catch (err) {
        console.error("EditProfile load error:", err);
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token, userId, navigate]);

  /* ================================
     Handlers
  ================================== */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddressChange = (index, e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = [...prev.shippingAddresses];
      updated[index] = { ...updated[index], [name]: value };
      return { ...prev, shippingAddresses: updated };
    });
  };

  const setDefaultAddress = (index) => {
    setFormData((prev) => ({
      ...prev,
      shippingAddresses: prev.shippingAddresses.map((a, i) => ({
        ...a,
        isDefault: i === index,
      })),
    }));
  };

  const addAddress = () => {
    if (formData.shippingAddresses.length >= 3) return;

    setFormData((prev) => ({
      ...prev,
      shippingAddresses: [
        ...prev.shippingAddresses,
        {
          streetAddress: "",
          city: "",
          state: "",
          country: "",
          postalCode: "",
          isDefault: false,
        },
      ],
    }));
  };

  const normalizePayload = (payload) => {
    const hasDefault = payload.shippingAddresses.some((a) => a.isDefault);
    return {
      ...payload,
      shippingAddresses: payload.shippingAddresses.map((a, idx) => ({
        ...a,
        isDefault: hasDefault ? a.isDefault : idx === 0,
      })),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await axios.put(
        `${API}/api/users/profile/${userId}`,
        normalizePayload(formData),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      navigate("/profile");
    } catch (err) {
      console.error("EditProfile save error:", err);
      setError(err?.response?.data?.message || "Failed to update profile.");
    }
  };

  /* ================================
     UI states
  ================================== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Loading profile…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white gap-4">
        <p>{error}</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-4 py-2 rounded bg-purple-600"
        >
          Back
        </button>
      </div>
    );
  }

  /* ================================
     Render
  ================================== */
  return (
    <div className="min-h-screen pt-24 pb-32 px-4 text-white bg-black flex justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl bg-black/70 p-8 rounded-2xl shadow-xl space-y-6"
      >
        <h1 className="text-3xl font-bold mb-2">Edit Profile</h1>

        <input
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Full name"
          className="w-full p-3 rounded bg-[#111]"
        />

        <input
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email"
          className="w-full p-3 rounded bg-[#111]"
        />

        <input
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Phone"
          className="w-full p-3 rounded bg-[#111]"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="acceptsInternationalTrade"
            checked={formData.acceptsInternationalTrade}
            onChange={handleChange}
          />
          Accept international trade
        </label>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl">Shipping addresses</h2>
            {formData.shippingAddresses.length < 3 && (
              <button
                type="button"
                onClick={addAddress}
                className="text-cyan-400 text-sm"
              >
                + Add
              </button>
            )}
          </div>

          {formData.shippingAddresses.map((addr, i) => (
            <div
              key={i}
              className="border border-white/10 p-4 rounded space-y-2"
            >
              <div className="flex justify-between items-center">
                <strong>Address {i + 1}</strong>
                <label className="text-sm flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!!addr.isDefault}
                    onChange={() => setDefaultAddress(i)}
                  />
                  Default
                </label>
              </div>

              <input
                name="streetAddress"
                value={addr.streetAddress || ""}
                onChange={(e) => handleAddressChange(i, e)}
                placeholder="Street"
                className="w-full p-2 rounded bg-[#111]"
              />
              <input
                name="city"
                value={addr.city || ""}
                onChange={(e) => handleAddressChange(i, e)}
                placeholder="City"
                className="w-full p-2 rounded bg-[#111]"
              />
              <input
                name="state"
                value={addr.state || ""}
                onChange={(e) => handleAddressChange(i, e)}
                placeholder="State"
                className="w-full p-2 rounded bg-[#111]"
              />
              <input
                name="country"
                value={addr.country || ""}
                onChange={(e) => handleAddressChange(i, e)}
                placeholder="Country"
                className="w-full p-2 rounded bg-[#111]"
              />
              <input
                name="postalCode"
                value={addr.postalCode || ""}
                onChange={(e) => handleAddressChange(i, e)}
                placeholder="Postal code"
                className="w-full p-2 rounded bg-[#111]"
              />
            </div>
          ))}
        </div>

        {/* Payment Methods */}
        <button
          type="button"
          onClick={() => navigate("/paymentmethods")}
          className="w-full bg-cyan-600 hover:bg-cyan-500 transition p-3 rounded font-bold"
        >
          Manage Payment Methods
        </button>

        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            className="flex-1 bg-purple-600 hover:bg-purple-500 transition p-3 rounded font-bold"
          >
            Save changes
          </button>

          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex-1 bg-gray-700 hover:bg-gray-600 transition p-3 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
