import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2, Save, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/states";
import { Header } from "@/components/layout/Header";
import { PageBody } from "@/components/layout/AppLayout";
import { Field } from "@/pages/AuthShell";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Profile() {
  const { user, updateProfile, changePassword, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ?? "");
  const [gender, setGender] = useState(user?.gender ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setDateOfBirth(user?.dateOfBirth ?? "");
    setGender(user?.gender ?? "");
    setPhoneNumber(user?.phoneNumber ?? "");
    setLocation(user?.location ?? "");
  }, [user]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileError(null);
    setProfileSaved(false);
    if (!name.trim()) {
      setProfileError("Enter your name.");
      return;
    }
    setProfileSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        phoneNumber: phoneNumber.trim() || null,
        location: location.trim() || null,
      });
      setProfileSaved(true);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "We couldn't update your profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword.length < 8) {
      setPasswordError("Use at least 8 characters for your new password.");
      return;
    }
    if (newPassword.length > 128) {
      setPasswordError("Use 128 characters or fewer.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords don't match.");
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "We couldn't change your password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function confirmDeleteAccount(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      setDeleteOpen(false);
      navigate({ to: "/login" });
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "We couldn't delete your account. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Header title="Profile" />
      <PageBody>
        <div className="mx-auto max-w-3xl fade-in-up">
          <div className="mb-7">
            <p className="eyebrow">YOUR ACCOUNT</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Profile and security</h1>
            <p className="mt-2 text-muted-foreground">Manage your account details and password.</p>
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7" aria-labelledby="account-details-title">
              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><UserRound className="h-5 w-5" /></span>
                <div><h2 id="account-details-title" className="font-semibold">Account details</h2><p className="text-sm text-muted-foreground">Manage the details saved with your account.</p></div>
              </div>
              <div className="mb-5 grid gap-4 rounded-xl bg-background p-4 sm:grid-cols-2">
                <div><p className="text-xs font-medium text-muted-foreground">Email</p><p className="mt-1 break-all text-sm font-medium">{user?.email}</p><p className="mt-1 text-xs text-muted-foreground">Email changes aren’t available yet.</p></div>
                <div><p className="text-xs font-medium text-muted-foreground">Member since</p><p className="mt-1 text-sm font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—"}</p></div>
              </div>
              <form onSubmit={saveProfile} className="space-y-4">
                <Field id="profile-name" label="Name">
                  <Input id="profile-name" autoComplete="name" value={name} maxLength={80} onChange={(event) => { setName(event.target.value); setProfileSaved(false); }} />
                </Field>
                <p className="text-xs text-muted-foreground">The following details are optional and are not used in your decision scores.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="profile-date-of-birth" label="Date of birth">
                    <Input id="profile-date-of-birth" type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={dateOfBirth} onChange={(event) => { setDateOfBirth(event.target.value); setProfileSaved(false); }} />
                  </Field>
                  <Field id="profile-gender" label="Gender">
                    <Select value={gender} onValueChange={(value) => { setGender(value); setProfileSaved(false); }}>
                      <SelectTrigger id="profile-gender"><SelectValue placeholder="Choose if you want" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="woman">Woman</SelectItem>
                        <SelectItem value="man">Man</SelectItem>
                        <SelectItem value="non_binary">Non-binary</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field id="profile-phone" label="Phone number">
                    <Input id="profile-phone" type="tel" autoComplete="tel" maxLength={32} placeholder="Your phone number" value={phoneNumber} onChange={(event) => { setPhoneNumber(event.target.value); setProfileSaved(false); }} />
                  </Field>
                  <Field id="profile-location" label="Location">
                    <Input id="profile-location" autoComplete="address-level2" maxLength={120} placeholder="City or region" value={location} onChange={(event) => { setLocation(event.target.value); setProfileSaved(false); }} />
                  </Field>
                </div>
                {profileError && <ErrorState message={profileError} />}
                {profileSaved && <p role="status" className="text-sm font-medium text-success">Your profile has been updated.</p>}
                <div className="flex justify-end"><Button type="submit" disabled={profileSaving || !name.trim()}>{profileSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save profile</>}</Button></div>
              </form>
            </section>

            <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7" aria-labelledby="security-title">
              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><KeyRound className="h-5 w-5" /></span>
                <div><h2 id="security-title" className="font-semibold">Change password</h2><p className="text-sm text-muted-foreground">Choose a password you haven’t used for this account before.</p></div>
              </div>
              <form onSubmit={savePassword} className="space-y-4">
                <Field id="current-password" label="Current password">
                  <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setPasswordSaved(false); }} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="new-password" label="New password">
                    <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setPasswordSaved(false); }} />
                  </Field>
                  <Field id="confirm-password" label="Confirm new password">
                    <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setPasswordSaved(false); }} />
                  </Field>
                </div>
                <p className="text-xs text-muted-foreground">Use 8–128 characters. Other active sessions will be signed out after the change.</p>
                {passwordError && <ErrorState message={passwordError} />}
                {passwordSaved && <p role="status" className="text-sm font-medium text-success">Password changed. Your other sessions have been signed out.</p>}
                <div className="flex justify-end"><Button type="submit" disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}>{passwordSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</> : "Update password"}</Button></div>
              </form>
            </section>

            <section className="rounded-2xl border border-destructive/30 bg-card p-5 shadow-sm sm:p-7" aria-labelledby="delete-account-title">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/10 text-destructive"><Trash2 className="h-5 w-5" /></span>
                <div><h2 id="delete-account-title" className="font-semibold">Delete account</h2><p className="text-sm text-muted-foreground">Permanently remove your account and its saved data.</p></div>
              </div>
              <AlertDialog open={deleteOpen} onOpenChange={(open) => { if (!deleting) { setDeleteOpen(open); if (!open) { setDeletePassword(""); setDeleteError(null); } } }}>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive">Delete my account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your OptiChoice account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes your account, evaluations, and drafts. You’ll be signed out and can’t undo this.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2">
                    <Field id="delete-account-password" label="Enter your password to confirm">
                      <Input id="delete-account-password" type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => { setDeletePassword(event.target.value); setDeleteError(null); }} />
                    </Field>
                    {deleteError && <ErrorState message={deleteError} />}
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteAccount} disabled={!deletePassword || deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</> : "Permanently delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </section>
          </div>
        </div>
      </PageBody>
    </>
  );
}
