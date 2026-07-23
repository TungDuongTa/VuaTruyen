"use server";
import { auth } from "../better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { normalizeCallbackUrl } from "../view-utils";
import type { SignInFormData, SignUpFormData } from "../zod/auth.schema";
import {
  deleteAvatarByUrl,
  uploadUserAvatar,
} from "@/lib/server/r2-avatar";

const MAX_AVATAR_SIZE_BYTES = 1024 * 1024;
const ALLOWED_AVATAR_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const signUpWithEmail = async (data: SignUpFormData) => {
  try {
    await auth.api.signUpEmail({
      body: {
        name: data.userName,
        email: data.email,
        password: data.password,
      },
    });
    return { success: true, message: "Sign-up successful" };
  } catch (error) {
    console.error("Sign-up error:", error);
    return { success: false, message: "Sign-up failed" };
  }
};

export const signOut = async () => {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch (error) {
    console.error("Sign-out error:", error);
    return { success: false, message: "Sign-out failed" };
  }
};

type UpdateUserProfileResult = {
  success: boolean;
  message: string;
  image?: string | null;
};

export const updateUserProfile = async (
  formData: FormData,
): Promise<UpdateUserProfileResult> => {
  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({
      headers: requestHeaders,
    });
    const userId = session?.user?.id;
    if (!userId) {
      return {
        success: false,
        message: "Please sign in to update your profile.",
      };
    }

    const name = String(formData.get("displayName") || "").trim();
    if (name.length < 2 || name.length > 40) {
      return {
        success: false,
        message: "Tên hiển thị phải có từ 2 đến 40 ký tự",
      };
    }

    const clearAvatar = String(formData.get("clearAvatar") || "") === "1";
    const avatarEntry = formData.get("avatar");
    const avatarFile =
      avatarEntry instanceof File && avatarEntry.size > 0 ? avatarEntry : null;

    let nextImage: string | null | undefined = undefined;
    const previousImage = String(session.user.image || "").trim() || null;

    if (clearAvatar) {
      nextImage = null;
    } else if (avatarFile) {
      if (!ALLOWED_AVATAR_MIME.has(avatarFile.type)) {
        return {
          success: false,
          message: "Avatar must be JPEG, PNG, WebP, or GIF.",
        };
      }

      if (avatarFile.size > MAX_AVATAR_SIZE_BYTES) {
        return {
          success: false,
          message: "Avatar image must be 1MB or smaller.",
        };
      }

      const buffer = Buffer.from(await avatarFile.arrayBuffer());
      nextImage = await uploadUserAvatar(userId, buffer);
    }

    await auth.api.updateUser({
      headers: requestHeaders,
      body: {
        name,
        ...(nextImage !== undefined ? { image: nextImage } : {}),
      },
    });

    if (
      nextImage !== undefined &&
      previousImage &&
      previousImage !== nextImage
    ) {
      await deleteAvatarByUrl(previousImage);
    }

    revalidatePath("/");
    revalidatePath("/profile");

    return {
      success: true,
      message: "Profile updated successfully.",
      image: nextImage === undefined ? previousImage : nextImage,
    };
  } catch (error) {
    console.error("Update profile error:", error);
    return { success: false, message: "Failed to update profile." };
  }
};

export const signInWithEmail = async (data: SignInFormData) => {
  try {
    await auth.api.signInEmail({
      body: {
        email: data.email,
        password: data.password,
      },
    });
    return { success: true, message: "Sign-in successful" };
  } catch (error) {
    console.error("Sign-in error:", error);
    return {
      success: false,
      message: "Email hoặc mật khẩu không đúng. Vui lòng thử lại",
    };
  }
};

export const signInWithGoogle = async (formData?: FormData) => {
  const callbackUrlInput = formData?.get("callbackUrl");
  const callbackURL = normalizeCallbackUrl(
    typeof callbackUrlInput === "string" ? callbackUrlInput : null,
  );

  const response = await auth.api.signInSocial({
    body: {
      provider: "google",
      callbackURL,
      disableRedirect: true,
    },
  });

  if (!response.url) {
    throw new Error("Failed to create Google sign-in URL");
  }

  redirect(response.url);
};
