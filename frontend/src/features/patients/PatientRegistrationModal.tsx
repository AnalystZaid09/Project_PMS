import React, { useState, useEffect } from "react";
import { AlertTriangle, UserCheck, Check, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { PatientItem, PatientCategoryItem, DuplicateMatch } from "@/types";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PatientRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (patient: PatientItem) => void;
  onSelectExisting?: (patientId: string) => void;
  initialPhone?: string;
}

export const PatientRegistrationModal: React.FC<PatientRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSelectExisting,
  initialPhone = "",
}) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [dob, setDob] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("male");
  const [bloodGroup, setBloodGroup] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [categories, setCategories] = useState<PatientCategoryItem[]>([]);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [isCheckingDup, setIsCheckingDup] = useState(false);
  const [hasAcknowledgedDup, setHasAcknowledgedDup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      apiClient
        .get<PatientCategoryItem[]>("/patient-categories?active_only=true")
        .then((res) => {
          setCategories(res.data);
          const regular = res.data.find((c) => c.name.toLowerCase().includes("regular"));
          if (regular) setCategoryId(regular.id);
        })
        .catch(console.error);

      // Reset fields
      setFirstName("");
      setLastName("");
      setPhone(initialPhone);
      setDob("");
      setAge("");
      setGender("male");
      setBloodGroup("");
      setNationalId("");
      setEmail("");
      setAddress("");
      setCity("");
      setEmergencyContact("");
      setDuplicateMatches([]);
      setHasAcknowledgedDup(false);
      setErrorMsg(null);
    }
  }, [isOpen, initialPhone]);

  // Handle DOB change -> update age
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDob(val);
    if (val) {
      const birthDate = new Date(val);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      setAge(calculatedAge >= 0 ? calculatedAge : 0);
    }
  };

  // Live duplicate checking on phone or name change
  const runDuplicateCheck = async () => {
    if (phone.trim().length >= 6) {
      setIsCheckingDup(true);
      try {
        const res = await apiClient.post("/patients/check-duplicates", {
          phone: phone.trim(),
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
          dob: dob || undefined,
        });
        if (res.data.has_duplicates) {
          setDuplicateMatches(res.data.possible_matches);
        } else {
          setDuplicateMatches([]);
        }
      } catch (err) {
        console.error("Duplicate check failed:", err);
      } finally {
        setIsCheckingDup(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setErrorMsg("Please provide first name, last name, and a valid phone number.");
      return;
    }

    if (duplicateMatches.length > 0 && !hasAcknowledgedDup) {
      setErrorMsg("Please review the duplicate warnings or select an existing patient.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        dob: dob || null,
        age: age === "" ? null : Number(age),
        gender,
        blood_group: bloodGroup || null,
        national_id: nationalId.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        emergency_contact: emergencyContact.trim() || null,
        category_id: categoryId || null,
      };

      const res = await apiClient.post<PatientItem>("/patients", payload);
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to register patient. Please verify input data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogHeader title="Register New Patient" onClose={onClose} />
      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        {errorMsg && (
          <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {errorMsg}
          </div>
        )}

        {/* Duplicate Warning Banner */}
        {duplicateMatches.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900">
                  Potential Duplicate Patient Records Found ({duplicateMatches.length})
                </h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  The phone number or name matches existing registered patient(s). Please verify before creating a new record.
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {duplicateMatches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 bg-white border border-amber-200 rounded text-xs"
                >
                  <div>
                    <span className="font-semibold text-gray-800">{m.full_name}</span>{" "}
                    <span className="text-primary font-mono ml-1 font-medium">({m.patient_uhid})</span>
                    <div className="text-gray-500 text-[11px] mt-0.5">
                      Phone: {m.phone} | Gender: {m.gender} {m.age ? `| Age: ${m.age}` : ""} {m.city ? `| City: ${m.city}` : ""}
                    </div>
                    <div className="text-amber-700 text-[11px] font-medium mt-0.5">
                      {m.match_reasons.join(", ")}
                    </div>
                  </div>
                  {onSelectExisting && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs border-amber-400 hover:bg-amber-100 flex items-center gap-1"
                      onClick={() => {
                        onSelectExisting(m.id);
                        onClose();
                      }}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Use This Patient
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="ack_dup"
                checked={hasAcknowledgedDup}
                onChange={(e) => setHasAcknowledgedDup(e.target.checked)}
                className="h-4 w-4 rounded border-amber-300 text-primary focus:ring-primary"
              />
              <label htmlFor="ack_dup" className="text-xs text-amber-900 font-medium cursor-pointer">
                I have verified that this is a separate patient with the same contact or name.
              </label>
            </div>
          </div>
        )}

        {/* Demographics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onBlur={runDuplicateCheck}
              placeholder="e.g. Rahul"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onBlur={runDuplicateCheck}
              placeholder="e.g. Sharma"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Mobile Phone <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={runDuplicateCheck}
                placeholder="+91-9820012345"
                required
              />
              {isCheckingDup && (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin absolute right-3 top-2.5" />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="undisclosed">Undisclosed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
            <Input
              type="date"
              value={dob}
              onChange={handleDobChange}
              onBlur={runDuplicateCheck}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Age (Years)</label>
            <Input
              type="number"
              min={0}
              max={150}
              value={age}
              onChange={(e) => setAge(e.target.value ? Number(e.target.value) : "")}
              placeholder="Auto-calculated or enter age"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Blood Group</label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select Blood Group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Patient Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Standard / General</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.discount_percentage ? `(${c.discount_percentage}% discount)` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="patient@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">National ID / Aadhar</label>
            <Input
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              placeholder="e.g. 1234-5678-9012"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Mumbai"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Emergency Contact</label>
            <Input
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="Spouse / Kin Phone"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Residential Address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className="w-full text-sm border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Flat/House No., Street, Landmark"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex items-center gap-1.5">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Complete Registration
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

