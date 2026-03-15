import { SignUpForm } from "@/features/auth/components/signup-form";
import { requireUnauth } from "@/lib/auth-utils";

const SignUpPage = async () => {
  await requireUnauth();
  return (
    <div className="flex justify-center items-center w-full h-screen ">
      <SignUpForm />
    </div>
  );
};

export default SignUpPage;
