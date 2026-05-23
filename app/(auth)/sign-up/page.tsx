"use client";
import InputField from "@/components/forms/InputField";
import SocialButton from "@/components/social-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signUpWithEmail } from "@/lib/actions/auth.actions";
import { signUpSchema } from "@/lib/zod/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const SignUp = () => {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      userName: "",
      email: "",
      password: "",
    },
    mode: "onBlur",
  });
  const onSubmit = async (data: SignUpFormData) => {
    try {
      const result = await signUpWithEmail(data);
      if (result.success) {
        router.replace("/");
        console.log("success");
      }
    } catch (error) {
      console.error("Sign-up error:", error);
      toast.error("Đăng kí thất bại. Vui lòng thử lại.", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to create an account",
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
            Hãy đăng kí để lưu danh sách theo dõi và lịch sử đọc của bạn
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-4"></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <InputField
                name="userName"
                label="Tên thí chủ"
                Icon={User}
                type="text"
                placeholder="Hãy nhập tên của bạn"
                register={register}
                error={errors.userName}
              />
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
                label="Mật khẩu"
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
              <div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" className="rounded border-border" />
                  Tôi đồng ý với điều khoản sử dụng
                </label>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Đang tạo tài khoản ..." : "Tạo tài khoản"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-center text-sm text-muted-foreground mb-3">
                Đã có tài khoản?{" "}
                <Link href="/sign-in" className="text-primary hover:underline">
                  Đăng nhập
                </Link>
              </p>
              <p className="text-center text-sm text-muted-foreground mb-4">
                Hoặc đăng nhập với
              </p>
              <SocialButton />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SignUp;
