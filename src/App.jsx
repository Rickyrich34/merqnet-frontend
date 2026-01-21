import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import MainDashboard from "./pages/MainDashboard";
import Messages from "./pages/Messages";
import History from "./pages/History";

import ProfileView from "./pages/ProfileView";
import EditProfile from "./pages/EditProfile";

import PaymentMethods from "./pages/PaymentMethods";
import ReceiptView from "./pages/ReceiptView";

import About from "./pages/About";
import Help from "./pages/Help";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

import BuyerDashboard from "./pages/BuyerDashboard";
import SellerDashboard from "./pages/SellerDashboard";

import CreateRequest from "./pages/CreateRequest";
import SubmitBid from "./pages/SubmitBid";
import SellerBids from "./pages/SellerBids";
import AcceptBid from "./pages/AcceptBid";

import AskTheSeller from "./pages/AskTheSeller";
import BuyerThread from "./pages/BuyerThread";
import AnswerBack from "./pages/AnswerBack";
import SellerAnswer from "./pages/SellerAnswer";

import ChangePassword from "./pages/ChangePassword";

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Core */}
        <Route path="/dashboard" element={<MainDashboard />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/history" element={<History />} />

        {/* Profile */}
        <Route path="/profile" element={<ProfileView />} />
        <Route path="/editprofile" element={<EditProfile />} />

        {/* IMPORTANT: Settings.jsx does NOT exist -> map /settings to EditProfile */}
        <Route path="/settings" element={<EditProfile />} />

        {/* Payments / Receipts */}
        <Route path="/paymentmethods" element={<PaymentMethods />} />
        <Route path="/receipt/:receiptId" element={<ReceiptView />} />

        {/* Info */}
        <Route path="/about" element={<About />} />
        <Route path="/help" element={<Help />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        {/* Buyer/Seller */}
        <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
        <Route path="/seller-dashboard" element={<SellerDashboard />} />

        {/* Requests/Bids */}
        <Route path="/createrequest" element={<CreateRequest />} />
        <Route path="/submitbid/:requestId" element={<SubmitBid />} />
        <Route path="/sellerbids" element={<SellerBids />} />
        <Route path="/acceptbid/:bidId" element={<AcceptBid />} />

        {/* Threads / Q&A */}
        <Route path="/asktheseller/:bidId" element={<AskTheSeller />} />
        <Route path="/buyerthread/:threadId" element={<BuyerThread />} />
        <Route path="/answerback/:threadId" element={<AnswerBack />} />
        <Route path="/selleranswer/:threadId" element={<SellerAnswer />} />

        {/* Account */}
        <Route path="/changepassword" element={<ChangePassword />} />
      </Routes>
    </Router>
  );
};

export default App;
