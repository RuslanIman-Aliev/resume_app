import { SignInForm } from "@/features/auth/components/signin-form";
import { requireUnauth } from "@/lib/auth-utils";

const SignInPage = async () => {
  await requireUnauth();
  return <SignInForm />;
};

export default SignInPage;
