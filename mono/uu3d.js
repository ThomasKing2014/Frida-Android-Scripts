(function () {
  "use strict";

  // Copy from http://stackoverflow.com/a/4673436/3026513
  if (!String.prototype.format) {
    String.prototype.format = function () {
      var args = arguments;
      return this.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number] != 'undefined' ?
          args[number] :
          match;
      });
    };
  }

  console.log("[*] Ultimate Unity3D DLLs Dumper");

  const PACKAGE_NAME = "__PACKAGE_NAME__";
  const APP_FILES_PATH = "/data/data/{0}/files".format(PACKAGE_NAME);

  try {
    const LIBMONO = "libmono.so";

    while (true) {
      Thread.sleep(0.1);
      if (Module.findBaseAddress(LIBMONO) != null) {
        break;
      }
    }

    console.log("[*] libmono is loaded.");

    const func_mono_image_open_from_data_with_name =
      Module.findExportByName(LIBMONO, "mono_image_open_from_data_with_name");

    Interceptor.attach(func_mono_image_open_from_data_with_name, {
      // https://github.com/mono/mono/blob/0e97e079fa6f90c2bf864d315a2e2c8bf8ca7410/mono/metadata/image.c#L1272
      // mono_image_open_from_data_internal (char *data,
      // guint32 data_len,
      // gboolean need_copy,
      // MonoImageOpenStatus *status,
      // gboolean refonly,
      // gboolean metadata_only,
      // const char *name)
      onEnter: function (args) {
        try {

          this.data = args[0];
          this.size = args[1];
          this.assembly_name = Memory.readUtf8String(args[5]);
        } catch (e) {
          console.log("[-] onEnter failed, {0}".format(e));
        }
      },
      onLeave: function (retval) {
        // TODO: check retval.
        
        try {
          if (this.data !== null) {
            let file_name = "";
            if (this.assembly_name === null) {
              // use size as suffix .
              file_name = "noname_{0}.dll".format(this.size);
            } else {
              file_name = this.assembly_name.split("/").pop();
            }

            let output_path = "{0}/{1}".format(APP_FILES_PATH, file_name);
            console.log("[*] Found .Net assembly {0}, at {1} - {2}".format(file_name, this.data, this.size));

            console.log(hexdump(this.data, {
              offset: 0,
              length: 0x30,
              header: true,
              ansi: true
            }));
            
            var out = new File(output_path, "wb");
            out.write(Memory.readByteArray(this.data, this.size.toInt32()));
            out.close();
            console.log("[*] Saved to {0}\n".format(output_path));

            
          }
        } catch (e) {
          console.log("[-] onLeave failed, {0}".format(e));
        }
      }
    });

  } catch (error) {
    console.log(error);
  }
})();