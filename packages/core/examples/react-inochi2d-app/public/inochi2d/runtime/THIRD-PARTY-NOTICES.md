# Third-Party Notices for the Bundled Inochi2D Runtime

The prebuilt browser runtime in this directory (`inochi2d_bg.wasm` and its
wasm-bindgen glue `inochi2d.js`) is compiled from Rust and statically links
the third-party libraries listed below. This notice is distributed alongside
the binaries to satisfy their license terms.

## Inox2D (BSD 2-Clause)

The runtime is built on [Inox2D](https://github.com/Inochi2D/inox2d), the
officially supported Rust implementation of the Inochi2D puppet rendering
framework (`inox2d` and `inox2d-opengl` crates).

```txt
Copyright (c) 2022 Speykious <speykious@gmail.com> and Inochi2D Project

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS "AS IS" AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## Other statically linked Rust crates

The wasm binary also statically links the following crates, each of which is
available under the MIT license (most are dual- or tri-licensed as
MIT OR Apache-2.0, some additionally under Zlib). They are used here under
the MIT license:

- [wasm-bindgen](https://github.com/wasm-bindgen/wasm-bindgen)
  (including `js-sys` and `web-sys`)
- [glow](https://github.com/grovesNL/glow)
- [glam](https://github.com/bitshifter/glam-rs)
- [image](https://github.com/image-rs/image)
- [png](https://github.com/image-rs/image-png)
- [fdeflate](https://github.com/image-rs/fdeflate)
- [crc32fast](https://github.com/srijs/rust-crc32fast)
- [zune-jpeg / zune-core](https://github.com/etemesi254/zune-image)
- [tracing-core](https://github.com/tokio-rs/tracing)
- [console_error_panic_hook](https://github.com/rustwasm/console_error_panic_hook)
- [hashbrown](https://github.com/rust-lang/hashbrown)
- [dlmalloc](https://github.com/alexcrichton/dlmalloc-rs)

MIT License text (see each project's repository for its copyright holders):

```txt
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
```

## Bundled model

The bundled Aka model has its own attribution notice; see
`../models/Aka.ATTRIBUTION.md`.
