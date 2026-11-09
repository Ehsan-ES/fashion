import { usePageContext } from "vike-react/usePageContext";
import NotFound, { ErrorFallback } from "../../src/shared/components/ui/NotFound";

export default function Page() {
  const { is404 } = usePageContext();
  return is404 ? <NotFound /> : <ErrorFallback />;
}
