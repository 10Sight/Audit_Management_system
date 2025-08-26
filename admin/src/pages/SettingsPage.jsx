// ProfilePage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Mail, Phone, Briefcase, IdCard, Shield } from "lucide-react";

export default function ProfilePage() {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/v1/auth/me", { withCredentials: true })
      .then((res) => {
        setProfile(res.data.data.employee);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-center text-white">Loading...</p>;
  if (!profile) return <p className="text-center text-red-400">No profile found.</p>;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white px-4 py-8 flex justify-center">
      <div className="w-full max-w-4xl bg-[#181818] rounded-xl shadow-lg border border-[#303030] p-6 md:p-10">
        
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-[#3ea6ff] flex items-center justify-center text-3xl font-bold">
              {profile.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-semibold">{profile.fullName}</h1>
              <p className="text-gray-400">{profile.role.toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-[#303030]"></div>

        {/* Profile Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ProfileItem icon={<Mail size={18} />} label="Email" value={profile.emailId} />
          <ProfileItem icon={<Phone size={18} />} label="Phone" value={profile.phoneNumber} />
          <ProfileItem icon={<Briefcase size={18} />} label="Department" value={profile.department} />
          <ProfileItem icon={<IdCard size={18} />} label="Employee ID" value={profile.employeeId} />
          <ProfileItem icon={<Shield size={18} />} label="Role" value={profile.role} />
        </div>

        {/* Admin Edit Button */}
        {currentUser?.role === "admin" && (
          <div className="mt-10 flex justify-end">
            <button className="bg-[#3ea6ff] hover:bg-[#65b8ff] px-6 py-2 rounded-lg text-black font-medium transition">
              Edit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 bg-[#212121] hover:bg-[#2a2a2a] p-4 rounded-lg transition">
      <span className="text-[#3ea6ff] mt-1">{icon}</span>
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-base font-medium text-white break-words">{value}</p>
      </div>
    </div>
  );
}
