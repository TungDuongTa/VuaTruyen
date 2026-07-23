"use client";
import InputField from "@/components/forms/InputField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInFormData } from "@/lib/better-auth/auth.schema";
import { authClient } from "@/lib/better-auth/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import SocialButton from "@/components/auth/social-button";
import Image from "next/image";
import { normalizeCallbackUrl } from "@/lib/better-auth/callback-url";

const SignIn = () => {
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = normalizeCallbackUrl(searchParams.get("callbackUrl"));
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });
  const onSubmit = async (data: SignInFormData) => {
    try {
      const { error } = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (error) {
        const message =
          error.message || "Email hoặc mật khẩu không đúng. Vui lòng thử lại";
        setError("password", { type: "manual", message });
        toast.error(message);
        return;
      }

      router.replace(callbackUrl);
      router.refresh();
    } catch (error) {
      console.error("Sign-in error:", error);
      toast.error("Đăng nhập thất bại. Vui lòng thử lại", {
        description:
          error instanceof Error ? error.message : "Failed to sign in",
      });
    }
  };
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="text-center mb-8">
          <Image
            src="/vuatruyentext.png"
            alt="VuaTruyen"
            width={1415}
            height={485}
            className="w-full h-full object-contain"
          />
          <p className="text-muted-foreground">
            Hãy đăng nhập để lưu danh sách theo dõi và lịch sử đọc của bạn
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-4"></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <InputField
                name="email"
                label="Email"
                Icon={Mail}
                type="text"
                placeholder="your@gmail.com"
                register={register}
                error={errors.email}
              />

              <InputField
                name="password"
                label="Mật Khẩu"
                Icon={Lock}
                type={showPassword ? "text" : "password"}
                placeholder="Hãy nhập mật khẩu của bạn"
                register={register}
                error={errors.password}
                children={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" className="rounded border-border" />
                  Nhớ tài khoản
                </label>
                <Link href="#" className="text-sm text-primary hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-center text-sm text-muted-foreground mb-3">
                Chưa có tài khoản?{" "}
                <Link href="/sign-up" className="text-primary hover:underline">
                  Đăng kí
                </Link>
              </p>
              <p className="text-center text-sm text-muted-foreground mb-4">
                Hoặc đăng nhập với
              </p>
              <SocialButton callbackUrl={callbackUrl} />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SignIn;
