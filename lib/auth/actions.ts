"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser } from "./server";
import { safeInternalRedirect } from "./redirect";

export type SignInState = {
  error: string | null;
};

export type PasswordSetupState = {
  error: string | null;
};

export type PasswordRecoveryState = {
  error: string | null;
  success: string | null;
};

export async function signIn(
  _previousState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const nextValue = formData.get("next");

  const email = typeof emailValue === "string" ? emailValue.trim() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const next = safeInternalRedirect(typeof nextValue === "string" ? nextValue : null);

  if (!email || !password) {
    return { error: "Enter your email address and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "Sign-in failed. Check your credentials and try again." };
  }

  redirect(next);
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

export async function sendPasswordRecovery(
  _previousState: PasswordRecoveryState,
  formData: FormData,
): Promise<PasswordRecoveryState> {
  const emailValue = formData.get("email");
  const email = typeof emailValue === "string" ? emailValue.trim() : "";

  if (!email) {
    return {
      error: "Enter your email address.",
      success: null,
    };
  }

  const supabase = await createClient();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback`,
  });

  if (error) {
    return {
      error: "The password recovery email could not be sent.",
      success: null,
    };
  }

  return {
    error: null,
    success: "Check your email for a password recovery link.",
  };
} 

export async function setInitialPassword(
  _previousState: PasswordSetupState,
  formData: FormData,
): Promise<PasswordSetupState> {
  const { supabase } = await requireAuthenticatedUser();
  const passwordValue = formData.get("password");
  const confirmationValue = formData.get("password_confirmation");
  const nextValue = formData.get("next");
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const confirmation = typeof confirmationValue === "string" ? confirmationValue : "";
  const next = safeInternalRedirect(typeof nextValue === "string" ? nextValue : null);

  if (password.length < 8) {
    return { error: "Use a password with at least 8 characters." };
  }
  if (password !== confirmation) {
    return { error: "The passwords do not match." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "The password could not be set. Please request a new invitation link." };
  }

  redirect(next);
}