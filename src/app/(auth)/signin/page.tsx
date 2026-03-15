import { SignInForm } from "@/features/auth/components/signin-form";
import { requireUnauth } from "@/lib/auth-utils";

const SignInPage = async () => {
    await requireUnauth();
  return (
    <>
      <div className="flex justify-center items-center w-full h-screen ">
        <SignInForm />
      </div>
    </>
  );
};

export default SignInPage;
