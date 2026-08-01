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
}

DocumentEditorContainerComponent.Inject(Toolbar);
