import { registerLicense } from "@syncfusion/ej2-base";
import {
  DocumentEditorContainerComponent,
  Toolbar,
} from "@syncfusion/ej2-react-documenteditor";

// Registers the Syncfusion license and injects the Toolbar module once, as a
// side effect of importing this module. Imported by the document-editor
// components so registration happens before the editor mounts.
const syncfusionLicense = process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE?.trim();

if (syncfusionLicense) {
  registerLicense(syncfusionLicense);
} else {
  // NEXT_PUBLIC_* values are inlined at build time, so a key added to the
  // hosting provider after the last build stays missing until a redeploy.
  // Without this warning the only symptom is Syncfusion's trial banner.
  console.warn(
    "[syncfusion] NEXT_PUBLIC_SYNCFUSION_LICENSE is not set in this build - the document editor will render the trial notice.",
  );
}

DocumentEditorContainerComponent.Inject(Toolbar);
