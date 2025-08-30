import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Mail, Phone, Briefcase, IdCard, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/v1/auth/me", {
          withCredentials: true,
        });
        setProfile(res.data.data.employee);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading)
    return <p className="text-center text-gray-700 mt-10">Loading...</p>;
  if (!profile)
    return <p className="text-center text-red-500 mt-10">No profile found.</p>;

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 px-4 py-8 flex justify-center">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-md border border-gray-300 p-6 sm:p-8 md:p-10">

        {/* Profile Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-3xl font-bold text-white shadow-md">
              {profile.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold break-words text-gray-900">
                {profile.fullName}
              </h1>
              <p className="text-gray-500 text-sm sm:text-base">
                {profile.role.toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-gray-300"></div>

        {/* Profile Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <ProfileItem icon={<Mail size={18} />} label="Email" value={profile.emailId} />
          <ProfileItem icon={<Phone size={18} />} label="Phone" value={profile.phoneNumber || "-"} />
          <ProfileItem icon={<Briefcase size={18} />} label="Department" value={profile.department || "-"} />
          <ProfileItem icon={<IdCard size={18} />} label="Employee ID" value={profile.employeeId} />
          <ProfileItem icon={<Shield size={18} />} label="Role" value={profile.role} />
        </div>

        {/* Admin Edit Button */}
        {currentUser?.role === "admin" && (
          <div className="mt-8 sm:mt-10 flex justify-end">
            <button
              className="bg-blue-600 hover:bg-blue-700 px-5 sm:px-6 py-2 sm:py-3 rounded-lg text-white font-medium transition w-full sm:w-auto shadow-sm"
              onClick={() => navigate(`/admin/employee/edit/${profile._id}`)}
            >
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
    <div className="flex items-start gap-3 bg-gray-100 hover:bg-gray-200 p-4 sm:p-5 rounded-lg transition break-words border border-gray-300">
      <span className="text-blue-600 mt-1">{icon}</span>
      <div className="flex-1">
        <p className="text-sm sm:text-base text-gray-500">{label}</p>
        <p className="text-base sm:text-lg font-medium text-gray-900 break-words">
          {value || "-"}
        </p>
      </div>
    </div>
  );
}
