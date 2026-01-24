import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

/**
 * ✅ PRODUCTION-PROOF API BASE
 * - If VITE vars exist but are empty/invalid, fallback to Railway backend.
 * - Prevents calls like https://app.merqnet.com/<userId>
 */
const RAW_ENV_API =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL)) ||
  "";

const API = (
  RAW_ENV_API &&
  typeof RAW_ENV_API === "string" &&
  RAW_ENV_API.startsWith("http")
    ? RAW_ENV_API
    : "https://merqnet-backend-production.up.railway.app"
).replace(/\/$/, "");

const EditProfile = () => {
  const navigate = useNavigate();

  // ✅ match ProfileView behavior: userToken OR token
  const token = localStorage.getItem("userToken") || localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    acceptsInternationalTrade: false,
    shippingAddresses: [],
  });

  const [editing, setEditing] = useState({
    fullName: false,
    email: false,
    phone: false,
  });

  useEffect(() => {
    // ✅ If auth missing, stop infinite loading and redirect
    if (!token || !userId) {
      setLoading(false);
      navigate("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const url = `${API}/api/users/profile/${userId}`;

        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const user = res.data;

        setFormData({
          fullName: user.fullName || "",
          email: user.email || "",
          phone: user.phone || "",
          acceptsInternationalTrade: !!user.acceptsInternationalTrade,
          shippingAddresses: Array.isArray(user.shippingAddresses) ? user.shippingAddresses : [],
        });
      } catch (error) {
        // ✅ Better debugging without changing behavior
        const status = error?.response?.status;
        const data = error?.response?.data;
        console.error("Error loading profile:", { status, data, error });

        // If unauthorized, bounce to login (prevents stuck UX loops)
        if (status === 401 || status === 403) {
          setLoading(false);
          navigate("/login");
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token, userId, navigate]);

  const toggleEdit = (field) => {
    setEditing((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddressChange = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      shippingAddresses: prev.shippingAddresses.map((addr) =>
        addr._id === id ? { ...addr, [field]: value } : addr
      ),
    }));
  };

  const addAddress = () => {
    if (formData.shippingAddresses.length >= 3) return;

    const newAddress = {
      _id: `temp-${Date.now()}`,
      streetAddress: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      isDefault: formData.shippingAddresses.length === 0,
    };

    setFormData((prev) => ({
      ...prev,
      shippingAddresses: [...prev.shippingAddresses, newAddress],
    }));
  };

  const setDefaultAddress = (id) => {
    setFormData((prev) => ({
      ...prev,
      shippingAddresses: prev.shippingAddresses.map((addr) => ({
        ...addr,
        isDefault: addr._id === id,
      })),
    }));
  };

  const handleSubmit = async () => {
    try {
      const cleanAddresses = formData.shippingAddresses.map((addr) => {
        const copy = { ...addr };
        if (copy._id && String(copy._id).startsWith("temp-")) {
          delete copy._id;
        }
        return copy;
      });

      const cleanPayload = {
        ...formData,
        shippingAddresses: cleanAddresses,
      };

      await axios.put(`${API}/api/users/profile/${userId}`, cleanPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      navigate("/profile");
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      console.error("Error saving changes:", { status, data, error });

      if (status === 401 || status === 403) {
        navigate("/login");
      }
    }
  };

  const renderField = (label, fieldName, type = "text") => (
    <div className="mb-6">
      <label className="text-purple-300 flex justify-between items-center mb-1">
        {label}
        <button
          type="button"
          onClick={() => toggleEdit(fieldName)}
          className="text-sm bg-purple-700 px-3 py-1 rounded hover:bg-purple-600"
        >
          {editing[fieldName] ? "Done" : "Edit"}
        </button>
      </label>
      <input
        type={type}
        name={fieldName}
        value={formData[fieldName]}
        disabled={!editing[fieldName]}
        onChange={handleChange}
        className={`w-full p-3 rounded bg-black/40 border border-purple-700 ${
          editing[fieldName] ? "opacity-100" : "opacity-60 cursor-not-allowed"
        }`}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        Loading...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pt-24 px-6 pb-40 text-white flex justify-center"
      style={{
        background: "linear-gradient(135deg, #0a0122 0%, #120034 50%, #1a0060 100%)",
      }}
    >
      <div className="max-w-2xl w-full bg-black/40 backdrop-blur-xl p-10 rounded-2xl shadow-[0_0_30px_#9900ff] border border-purple-700 relative">
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="absolute top-4 left-4 px-4 py-2 bg-purple-900/80 hover:bg-purple-700 text-white font-bold rounded-lg shadow-[0_0_12px_#ff00ff] transition"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold text-center mb-8 text-purple-300 drop-shadow-[0_0_10px_#9d00ff]">
          Edit Profile
        </h1>

        {renderField("Full name", "fullName")}
        {renderField("Email", "email", "email")}
        {renderField("Phone (+ country code)", "phone")}

        <div className="mt-6 mb-10">
          <label className="flex items-center gap-3 text-purple-300">
            <input
              type="checkbox"
              name="acceptsInternationalTrade"
              checked={formData.acceptsInternationalTrade}
              onChange={handleChange}
            />
            Available for international trading
          </label>
        </div>

        <h2 className="text-2xl font-semibold text-purple-400 mb-3">Shipping Addresses</h2>

        {formData.shippingAddresses.map((addr) => (
          <div
            key={addr._id}
            className="bg-purple-900/30 p-5 rounded-xl border border-purple-700 shadow-[0_0_15px_#7c00ff] mb-5"
          >
            <div className="mb-3">
              <label className="text-purple-300">Street</label>
              <input
                type="text"
                className="w-full p-2 rounded bg-black/40 border border-purple-700"
                value={addr.streetAddress || ""}
                onChange={(e) => handleAddressChange(addr._id, "streetAddress", e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="text-purple-300">City</label>
              <input
                type="text"
                className="w-full p-2 rounded bg-black/40 border border-purple-700"
                value={addr.city || ""}
                onChange={(e) => handleAddressChange(addr._id, "city", e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="text-purple-300">State / Province</label>
              <input
                type="text"
                className="w-full p-2 rounded bg-black/40 border border-purple-700"
                value={addr.state || ""}
                onChange={(e) => handleAddressChange(addr._id, "state", e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="text-purple-300">Country</label>
              <input
                type="text"
                className="w-full p-2 rounded bg-black/40 border border-purple-700"
                value={addr.country || ""}
                onChange={(e) => handleAddressChange(addr._id, "country", e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="text-purple-300">Postal code</label>
              <input
                type="text"
                className="w-full p-2 rounded bg-black/40 border border-purple-700"
                value={addr.postalCode || ""}
                onChange={(e) => handleAddressChange(addr._id, "postalCode", e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 mt-2 text-purple-300">
              <input type="radio" checked={!!addr.isDefault} onChange={() => setDefaultAddress(addr._id)} />
              Default address
            </label>
          </div>
        ))}

        <button
          type="button"
          onClick={addAddress}
          className="bg-purple-700 hover:bg-purple-600 transition px-5 py-2 rounded-lg text-white font-semibold mt-2 disabled:opacity-40"
          disabled={formData.shippingAddresses.length >= 3}
        >
          Add Address
        </button>

        <h2 className="text-2xl font-semibold text-purple-400 mt-10 mb-3">Password</h2>
        <button
          type="button"
          onClick={() => navigate("/changepassword")}
          className="bg-blue-700 hover:bg-blue-600 transition px-5 py-2 rounded-lg text-white font-semibold"
        >
          Change Password
        </button>

        <h2 className="text-2xl font-semibold text-purple-400 mt-10 mb-3">Payment Methods</h2>
        <button
          type="button"
          onClick={() => navigate("/paymentmethods")}
          className="bg-green-700 hover:bg-green-600 transition px-5 py-2 rounded-lg text-white font-semibold"
        >
          Manage Payment Methods
        </button>

        <div className="flex justify-end mt-10">
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-3 rounded-lg font-bold text-white bg-red-700 shadow-[0_0_12px_#ff004c] hover:bg-red-600"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
