export class Inochi2dRuntime {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    Inochi2dRuntimeFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_inochi2druntime_free(ptr, 0);
  }
  clear() {
    wasm.inochi2druntime_clear(this.__wbg_ptr);
  }
  /**
   * @returns {any}
   */
  get_frame_snapshot_summary() {
    const ret = wasm.inochi2druntime_get_frame_snapshot_summary(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * @returns {any}
   */
  get_runtime_profile_summary() {
    const ret = wasm.inochi2druntime_get_runtime_profile_summary(
      this.__wbg_ptr,
    );
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * @param {Uint8Array} bytes
   */
  load_model(bytes) {
    const ret = wasm.inochi2druntime_load_model(this.__wbg_ptr, bytes);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    const ret = wasm.inochi2druntime_new(canvas);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    this.__wbg_ptr = ret[0] >>> 0;
    Inochi2dRuntimeFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @param {number} width
   * @param {number} height
   * @param {number} device_pixel_ratio
   */
  resize(width, height, device_pixel_ratio) {
    const ret = wasm.inochi2druntime_resize(
      this.__wbg_ptr,
      width,
      height,
      device_pixel_ratio,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {string} node_name
   * @returns {number}
   */
  resolve_node_handle_by_name(node_name) {
    const ptr0 = passStringToWasm0(
      node_name,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.inochi2druntime_resolve_node_handle_by_name(
      this.__wbg_ptr,
      ptr0,
      len0,
    );
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] >>> 0;
  }
  /**
   * @param {string} parameter_id
   * @returns {number}
   */
  resolve_parameter_handle_by_name(parameter_id) {
    const ptr0 = passStringToWasm0(
      parameter_id,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.inochi2druntime_resolve_parameter_handle_by_name(
      this.__wbg_ptr,
      ptr0,
      len0,
    );
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] >>> 0;
  }
  /**
   * @param {number} position_x
   * @param {number} position_y
   * @param {number} scale
   */
  set_camera_transform(position_x, position_y, scale) {
    const ret = wasm.inochi2druntime_set_camera_transform(
      this.__wbg_ptr,
      position_x,
      position_y,
      scale,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {number} offset_x
   * @param {number} offset_y
   */
  set_head_sway_offset(offset_x, offset_y) {
    const ret = wasm.inochi2druntime_set_head_sway_offset(
      this.__wbg_ptr,
      offset_x,
      offset_y,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {string} parameter_id
   * @param {number} value
   */
  set_parameter_scalar(parameter_id, value) {
    const ptr0 = passStringToWasm0(
      parameter_id,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.inochi2druntime_set_parameter_scalar(
      this.__wbg_ptr,
      ptr0,
      len0,
      value,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {string} parameter_id
   * @param {number} value_x
   * @param {number} value_y
   */
  set_parameter_vec2(parameter_id, value_x, value_y) {
    const ptr0 = passStringToWasm0(
      parameter_id,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.inochi2druntime_set_parameter_vec2(
      this.__wbg_ptr,
      ptr0,
      len0,
      value_x,
      value_y,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {number} parameter_handle
   * @param {number} value_x
   * @param {number} value_y
   */
  set_parameter_vec2_by_handle(parameter_handle, value_x, value_y) {
    const ret = wasm.inochi2druntime_set_parameter_vec2_by_handle(
      this.__wbg_ptr,
      parameter_handle,
      value_x,
      value_y,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {number} node_handle
   * @param {number} opacity
   */
  set_part_opacity_by_handle(node_handle, opacity) {
    const ret = wasm.inochi2druntime_set_part_opacity_by_handle(
      this.__wbg_ptr,
      node_handle,
      opacity,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {string} node_name
   * @param {number} opacity
   */
  set_part_opacity_by_name(node_name, opacity) {
    const ptr0 = passStringToWasm0(
      node_name,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.inochi2druntime_set_part_opacity_by_name(
      this.__wbg_ptr,
      ptr0,
      len0,
      opacity,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {string} parameter_id
   * @param {number} value_x
   * @param {number} value_y
   */
  set_post_physics_parameter_vec2(parameter_id, value_x, value_y) {
    const ptr0 = passStringToWasm0(
      parameter_id,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.inochi2druntime_set_post_physics_parameter_vec2(
      this.__wbg_ptr,
      ptr0,
      len0,
      value_x,
      value_y,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {number} parameter_handle
   * @param {number} value_x
   * @param {number} value_y
   */
  set_post_physics_parameter_vec2_by_handle(
    parameter_handle,
    value_x,
    value_y,
  ) {
    const ret = wasm.inochi2druntime_set_post_physics_parameter_vec2_by_handle(
      this.__wbg_ptr,
      parameter_handle,
      value_x,
      value_y,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {number} node_handle
   * @param {number} translation_x
   * @param {number} translation_y
   * @param {number} rotation_z
   * @param {number} scale_x
   * @param {number} scale_y
   */
  set_post_physics_transform_offset_by_handle(
    node_handle,
    translation_x,
    translation_y,
    rotation_z,
    scale_x,
    scale_y,
  ) {
    const ret =
      wasm.inochi2druntime_set_post_physics_transform_offset_by_handle(
        this.__wbg_ptr,
        node_handle,
        translation_x,
        translation_y,
        rotation_z,
        scale_x,
        scale_y,
      );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {string} node_name
   * @param {number} translation_x
   * @param {number} translation_y
   * @param {number} rotation_z
   * @param {number} scale_x
   * @param {number} scale_y
   */
  set_post_physics_transform_offset_by_name(
    node_name,
    translation_x,
    translation_y,
    rotation_z,
    scale_x,
    scale_y,
  ) {
    const ptr0 = passStringToWasm0(
      node_name,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.inochi2druntime_set_post_physics_transform_offset_by_name(
      this.__wbg_ptr,
      ptr0,
      len0,
      translation_x,
      translation_y,
      rotation_z,
      scale_x,
      scale_y,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {number} offset_x
   * @param {number} offset_y
   */
  set_visible_accessory_sway_offset(offset_x, offset_y) {
    const ret = wasm.inochi2druntime_set_visible_accessory_sway_offset(
      this.__wbg_ptr,
      offset_x,
      offset_y,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {number} offset_x
   * @param {number} offset_y
   */
  set_visible_cloth_sway_offset(offset_x, offset_y) {
    const ret = wasm.inochi2druntime_set_visible_cloth_sway_offset(
      this.__wbg_ptr,
      offset_x,
      offset_y,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {number} offset_x
   * @param {number} offset_y
   */
  set_visible_hair_sway_offset(offset_x, offset_y) {
    const ret = wasm.inochi2druntime_set_visible_hair_sway_offset(
      this.__wbg_ptr,
      offset_x,
      offset_y,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {number} offset_x
   * @param {number} offset_y
   */
  set_visible_tail_sway_offset(offset_x, offset_y) {
    const ret = wasm.inochi2druntime_set_visible_tail_sway_offset(
      this.__wbg_ptr,
      offset_x,
      offset_y,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {number} timestamp_ms
   */
  tick(timestamp_ms) {
    const ret = wasm.inochi2druntime_tick(this.__wbg_ptr, timestamp_ms);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
}
if (Symbol.dispose)
  Inochi2dRuntime.prototype[Symbol.dispose] = Inochi2dRuntime.prototype.free;
function __wbg_get_imports() {
  const import0 = {
    __proto__: null,
    __wbg___wbindgen_boolean_get_6ea149f0a8dcc5ff: function (arg0) {
      const v = arg0;
      const ret = typeof v === 'boolean' ? v : undefined;
      return isLikeNone(ret) ? 0xffffff : ret ? 1 : 0;
    },
    __wbg___wbindgen_debug_string_ab4b34d23d6778bd: function (arg0, arg1) {
      const ret = debugString(arg1);
      const ptr1 = passStringToWasm0(
        ret,
        wasm.__wbindgen_malloc,
        wasm.__wbindgen_realloc,
      );
      const len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbg___wbindgen_is_undefined_29a43b4d42920abd: function (arg0) {
      const ret = arg0 === undefined;
      return ret;
    },
    __wbg___wbindgen_string_get_7ed5322991caaec5: function (arg0, arg1) {
      const obj = arg1;
      const ret = typeof obj === 'string' ? obj : undefined;
      var ptr1 = isLikeNone(ret)
        ? 0
        : passStringToWasm0(
            ret,
            wasm.__wbindgen_malloc,
            wasm.__wbindgen_realloc,
          );
      var len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbg___wbindgen_throw_6b64449b9b9ed33c: function (arg0, arg1) {
      throw new Error(getStringFromWasm0(arg0, arg1));
    },
    __wbg_activeTexture_3df5a43f55a69a6c: function (arg0, arg1) {
      arg0.activeTexture(arg1 >>> 0);
    },
    __wbg_activeTexture_546afc38eb98df71: function (arg0, arg1) {
      arg0.activeTexture(arg1 >>> 0);
    },
    __wbg_attachShader_1eec3a0d2bfe6f83: function (arg0, arg1, arg2) {
      arg0.attachShader(arg1, arg2);
    },
    __wbg_attachShader_e1c4cb1f00f167df: function (arg0, arg1, arg2) {
      arg0.attachShader(arg1, arg2);
    },
    __wbg_bindBuffer_710a611286e86fe9: function (arg0, arg1, arg2) {
      arg0.bindBuffer(arg1 >>> 0, arg2);
    },
    __wbg_bindBuffer_b193f35215c88d5d: function (arg0, arg1, arg2) {
      arg0.bindBuffer(arg1 >>> 0, arg2);
    },
    __wbg_bindFramebuffer_8d7b9da43a5c1c2b: function (arg0, arg1, arg2) {
      arg0.bindFramebuffer(arg1 >>> 0, arg2);
    },
    __wbg_bindFramebuffer_fab857ccf69f3da9: function (arg0, arg1, arg2) {
      arg0.bindFramebuffer(arg1 >>> 0, arg2);
    },
    __wbg_bindTexture_a87fb41b3319bcb9: function (arg0, arg1, arg2) {
      arg0.bindTexture(arg1 >>> 0, arg2);
    },
    __wbg_bindTexture_c3fcb7dc0c448083: function (arg0, arg1, arg2) {
      arg0.bindTexture(arg1 >>> 0, arg2);
    },
    __wbg_bindVertexArrayOES_b0e8a5a6c8a88c84: function (arg0, arg1) {
      arg0.bindVertexArrayOES(arg1);
    },
    __wbg_bindVertexArray_ea785b5f2238eb93: function (arg0, arg1) {
      arg0.bindVertexArray(arg1);
    },
    __wbg_blendEquation_0abbff18abcf6c63: function (arg0, arg1) {
      arg0.blendEquation(arg1 >>> 0);
    },
    __wbg_blendEquation_f0b8a2ea6cfe3a8a: function (arg0, arg1) {
      arg0.blendEquation(arg1 >>> 0);
    },
    __wbg_blendFunc_73401f287153631f: function (arg0, arg1, arg2) {
      arg0.blendFunc(arg1 >>> 0, arg2 >>> 0);
    },
    __wbg_blendFunc_9c1ee0744b7da386: function (arg0, arg1, arg2) {
      arg0.blendFunc(arg1 >>> 0, arg2 >>> 0);
    },
    __wbg_bufferData_f267cdc80efbd6a0: function (arg0, arg1, arg2, arg3) {
      arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
    },
    __wbg_bufferData_f401229c915b8028: function (arg0, arg1, arg2, arg3) {
      arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
    },
    __wbg_bufferSubData_3708c0445a03981a: function (arg0, arg1, arg2, arg3) {
      arg0.bufferSubData(arg1 >>> 0, arg2, arg3);
    },
    __wbg_bufferSubData_ade66d88865db9fc: function (arg0, arg1, arg2, arg3) {
      arg0.bufferSubData(arg1 >>> 0, arg2, arg3);
    },
    __wbg_clearColor_2b334a2a4b9f1124: function (arg0, arg1, arg2, arg3, arg4) {
      arg0.clearColor(arg1, arg2, arg3, arg4);
    },
    __wbg_clearColor_6e92030afcf0f68f: function (arg0, arg1, arg2, arg3, arg4) {
      arg0.clearColor(arg1, arg2, arg3, arg4);
    },
    __wbg_clearStencil_584a4c6144f1164d: function (arg0, arg1) {
      arg0.clearStencil(arg1);
    },
    __wbg_clearStencil_8a4463aa6ab4f980: function (arg0, arg1) {
      arg0.clearStencil(arg1);
    },
    __wbg_clear_d82c0c485d1af30e: function (arg0, arg1) {
      arg0.clear(arg1 >>> 0);
    },
    __wbg_clear_e39cde04b063e709: function (arg0, arg1) {
      arg0.clear(arg1 >>> 0);
    },
    __wbg_colorMask_5e1ce60e460bf963: function (arg0, arg1, arg2, arg3, arg4) {
      arg0.colorMask(arg1 !== 0, arg2 !== 0, arg3 !== 0, arg4 !== 0);
    },
    __wbg_colorMask_71190391f59922fe: function (arg0, arg1, arg2, arg3, arg4) {
      arg0.colorMask(arg1 !== 0, arg2 !== 0, arg3 !== 0, arg4 !== 0);
    },
    __wbg_compileShader_b39b7d5caca97c9d: function (arg0, arg1) {
      arg0.compileShader(arg1);
    },
    __wbg_compileShader_fc084de511370bc0: function (arg0, arg1) {
      arg0.compileShader(arg1);
    },
    __wbg_createBuffer_6ad9886c8fed1a21: function (arg0) {
      const ret = arg0.createBuffer();
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_createBuffer_f68202a47c36c3d6: function (arg0) {
      const ret = arg0.createBuffer();
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_createFramebuffer_03fa5aab12587b89: function (arg0) {
      const ret = arg0.createFramebuffer();
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_createFramebuffer_211e9c2acecac22f: function (arg0) {
      const ret = arg0.createFramebuffer();
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_createProgram_635f6f85c5f3c83d: function (arg0) {
      const ret = arg0.createProgram();
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_createProgram_bedc70c0d16e41df: function (arg0) {
      const ret = arg0.createProgram();
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_createShader_2c8d8c9f17967efe: function (arg0, arg1) {
      const ret = arg0.createShader(arg1 >>> 0);
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_createShader_5484e429d7514a9d: function (arg0, arg1) {
      const ret = arg0.createShader(arg1 >>> 0);
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_createTexture_caeb4349ae5c7a83: function (arg0) {
      const ret = arg0.createTexture();
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_createTexture_f9850d55f04c7883: function (arg0) {
      const ret = arg0.createTexture();
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_createVertexArrayOES_25823ca742b59551: function (arg0) {
      const ret = arg0.createVertexArrayOES();
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_createVertexArray_a8c3e6799bdb5af8: function (arg0) {
      const ret = arg0.createVertexArray();
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_disable_c83e7f9d8a8660e6: function (arg0, arg1) {
      arg0.disable(arg1 >>> 0);
    },
    __wbg_disable_d115c77f70b6b789: function (arg0, arg1) {
      arg0.disable(arg1 >>> 0);
    },
    __wbg_drawBuffersWEBGL_674a96484245cee8: function (arg0, arg1) {
      arg0.drawBuffersWEBGL(arg1);
    },
    __wbg_drawBuffers_0808a2009fb32b11: function (arg0, arg1) {
      arg0.drawBuffers(arg1);
    },
    __wbg_drawElements_46de48663337d73d: function (
      arg0,
      arg1,
      arg2,
      arg3,
      arg4,
    ) {
      arg0.drawElements(arg1 >>> 0, arg2, arg3 >>> 0, arg4);
    },
    __wbg_drawElements_fd9adcd1cc7deb47: function (
      arg0,
      arg1,
      arg2,
      arg3,
      arg4,
    ) {
      arg0.drawElements(arg1 >>> 0, arg2, arg3 >>> 0, arg4);
    },
    __wbg_enableVertexAttribArray_44d2f9d5bd7d4773: function (arg0, arg1) {
      arg0.enableVertexAttribArray(arg1 >>> 0);
    },
    __wbg_enableVertexAttribArray_a6fb4500c619f67f: function (arg0, arg1) {
      arg0.enableVertexAttribArray(arg1 >>> 0);
    },
    __wbg_enable_aafffd647725f82c: function (arg0, arg1) {
      arg0.enable(arg1 >>> 0);
    },
    __wbg_enable_e9e223bf04c318ac: function (arg0, arg1) {
      arg0.enable(arg1 >>> 0);
    },
    __wbg_error_a6fa202b58aa1cd3: function (arg0, arg1) {
      let deferred0_0;
      let deferred0_1;
      try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm0(arg0, arg1));
      } finally {
        wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
      }
    },
    __wbg_framebufferTexture2D_44e56e9e14542bb5: function (
      arg0,
      arg1,
      arg2,
      arg3,
      arg4,
      arg5,
    ) {
      arg0.framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4, arg5);
    },
    __wbg_framebufferTexture2D_f54db6e0dc9fac5e: function (
      arg0,
      arg1,
      arg2,
      arg3,
      arg4,
      arg5,
    ) {
      arg0.framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4, arg5);
    },
    __wbg_getContext_367a8d870ace1970: function () {
      return handleError(function (arg0, arg1, arg2, arg3) {
        const ret = arg0.getContext(getStringFromWasm0(arg1, arg2), arg3);
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
      }, arguments);
    },
    __wbg_getExtension_5228364a0715c7db: function () {
      return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.getExtension(getStringFromWasm0(arg1, arg2));
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
      }, arguments);
    },
    __wbg_getParameter_e1c6e394a2959d43: function () {
      return handleError(function (arg0, arg1) {
        const ret = arg0.getParameter(arg1 >>> 0);
        return ret;
      }, arguments);
    },
    __wbg_getProgramInfoLog_00af0d3e29c73293: function (arg0, arg1, arg2) {
      const ret = arg1.getProgramInfoLog(arg2);
      var ptr1 = isLikeNone(ret)
        ? 0
        : passStringToWasm0(
            ret,
            wasm.__wbindgen_malloc,
            wasm.__wbindgen_realloc,
          );
      var len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbg_getProgramInfoLog_612d2724e854e752: function (arg0, arg1, arg2) {
      const ret = arg1.getProgramInfoLog(arg2);
      var ptr1 = isLikeNone(ret)
        ? 0
        : passStringToWasm0(
            ret,
            wasm.__wbindgen_malloc,
            wasm.__wbindgen_realloc,
          );
      var len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbg_getProgramParameter_6aa39c38709e0d9d: function (arg0, arg1, arg2) {
      const ret = arg0.getProgramParameter(arg1, arg2 >>> 0);
      return ret;
    },
    __wbg_getProgramParameter_d18275e84d037799: function (arg0, arg1, arg2) {
      const ret = arg0.getProgramParameter(arg1, arg2 >>> 0);
      return ret;
    },
    __wbg_getShaderInfoLog_57fd85336a768aa9: function (arg0, arg1, arg2) {
      const ret = arg1.getShaderInfoLog(arg2);
      var ptr1 = isLikeNone(ret)
        ? 0
        : passStringToWasm0(
            ret,
            wasm.__wbindgen_malloc,
            wasm.__wbindgen_realloc,
          );
      var len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbg_getShaderInfoLog_ef603aa10b52d639: function (arg0, arg1, arg2) {
      const ret = arg1.getShaderInfoLog(arg2);
      var ptr1 = isLikeNone(ret)
        ? 0
        : passStringToWasm0(
            ret,
            wasm.__wbindgen_malloc,
            wasm.__wbindgen_realloc,
          );
      var len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbg_getShaderParameter_4676ea57a8db83ec: function (arg0, arg1, arg2) {
      const ret = arg0.getShaderParameter(arg1, arg2 >>> 0);
      return ret;
    },
    __wbg_getShaderParameter_f1ed538581985875: function (arg0, arg1, arg2) {
      const ret = arg0.getShaderParameter(arg1, arg2 >>> 0);
      return ret;
    },
    __wbg_getSupportedExtensions_a6b7a4d43810c644: function (arg0) {
      const ret = arg0.getSupportedExtensions();
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_getUniformLocation_084155a4348002df: function (
      arg0,
      arg1,
      arg2,
      arg3,
    ) {
      const ret = arg0.getUniformLocation(arg1, getStringFromWasm0(arg2, arg3));
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_getUniformLocation_91e9e13f695e50c5: function (
      arg0,
      arg1,
      arg2,
      arg3,
    ) {
      const ret = arg0.getUniformLocation(arg1, getStringFromWasm0(arg2, arg3));
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_get_unchecked_17f53dad852b9588: function (arg0, arg1) {
      const ret = arg0[arg1 >>> 0];
      return ret;
    },
    __wbg_height_528848d067cc2221: function (arg0) {
      const ret = arg0.height;
      return ret;
    },
    __wbg_instanceof_WebGl2RenderingContext_23f2da2f294d4c8e: function (arg0) {
      let result;
      try {
        result = arg0 instanceof WebGL2RenderingContext;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    },
    __wbg_instanceof_Window_cc64c86c8ef9e02b: function (arg0) {
      let result;
      try {
        result = arg0 instanceof Window;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    },
    __wbg_length_3d4ecd04bd8d22f1: function (arg0) {
      const ret = arg0.length;
      return ret;
    },
    __wbg_length_9f1775224cf1d815: function (arg0) {
      const ret = arg0.length;
      return ret;
    },
    __wbg_linkProgram_0f095b446d393a30: function (arg0, arg1) {
      arg0.linkProgram(arg1);
    },
    __wbg_linkProgram_aa5b01ff0fcf3a80: function (arg0, arg1) {
      arg0.linkProgram(arg1);
    },
    __wbg_new_227d7c05414eb861: function () {
      const ret = new Error();
      return ret;
    },
    __wbg_new_682678e2f47e32bc: function () {
      const ret = new Array();
      return ret;
    },
    __wbg_new_aa8d0fa9762c29bd: function () {
      const ret = new Object();
      return ret;
    },
    __wbg_now_36a3148ac47c4ad7: function (arg0) {
      const ret = arg0.now();
      return ret;
    },
    __wbg_now_a9b7df1cbee90986: function () {
      const ret = Date.now();
      return ret;
    },
    __wbg_of_07054ba808010e4f: function (arg0) {
      const ret = Array.of(arg0);
      return ret;
    },
    __wbg_performance_e0409977f06d6f6b: function (arg0) {
      const ret = arg0.performance;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_prototypesetcall_a6b02eb00b0f4ce2: function (arg0, arg1, arg2) {
      Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
    },
    __wbg_push_471a5b068a5295f6: function (arg0, arg1) {
      const ret = arg0.push(arg1);
      return ret;
    },
    __wbg_set_022bee52d0b05b19: function () {
      return handleError(function (arg0, arg1, arg2) {
        const ret = Reflect.set(arg0, arg1, arg2);
        return ret;
      }, arguments);
    },
    __wbg_set_height_be9b2b920bd68401: function (arg0, arg1) {
      arg0.height = arg1 >>> 0;
    },
    __wbg_set_width_5cda41d4d06a14dd: function (arg0, arg1) {
      arg0.width = arg1 >>> 0;
    },
    __wbg_shaderSource_084cd6ed337b36be: function (arg0, arg1, arg2, arg3) {
      arg0.shaderSource(arg1, getStringFromWasm0(arg2, arg3));
    },
    __wbg_shaderSource_9b5906e1f027a314: function (arg0, arg1, arg2, arg3) {
      arg0.shaderSource(arg1, getStringFromWasm0(arg2, arg3));
    },
    __wbg_stack_3b0d974bbf31e44f: function (arg0, arg1) {
      const ret = arg1.stack;
      const ptr1 = passStringToWasm0(
        ret,
        wasm.__wbindgen_malloc,
        wasm.__wbindgen_realloc,
      );
      const len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbg_static_accessor_GLOBAL_8cfadc87a297ca02: function () {
      const ret = typeof global === 'undefined' ? null : global;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_static_accessor_GLOBAL_THIS_602256ae5c8f42cf: function () {
      const ret = typeof globalThis === 'undefined' ? null : globalThis;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_static_accessor_SELF_e445c1c7484aecc3: function () {
      const ret = typeof self === 'undefined' ? null : self;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_static_accessor_WINDOW_f20e8576ef1e0f17: function () {
      const ret = typeof window === 'undefined' ? null : window;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_stencilFunc_5fd76b4724f9341a: function (arg0, arg1, arg2, arg3) {
      arg0.stencilFunc(arg1 >>> 0, arg2, arg3 >>> 0);
    },
    __wbg_stencilFunc_fdb015737c5c780f: function (arg0, arg1, arg2, arg3) {
      arg0.stencilFunc(arg1 >>> 0, arg2, arg3 >>> 0);
    },
    __wbg_stencilMask_38acb5180bfdee01: function (arg0, arg1) {
      arg0.stencilMask(arg1 >>> 0);
    },
    __wbg_stencilMask_7f6b699426cca747: function (arg0, arg1) {
      arg0.stencilMask(arg1 >>> 0);
    },
    __wbg_stencilOp_36eab248b4f3a677: function (arg0, arg1, arg2, arg3) {
      arg0.stencilOp(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0);
    },
    __wbg_stencilOp_4513227bdd11f42b: function (arg0, arg1, arg2, arg3) {
      arg0.stencilOp(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0);
    },
    __wbg_texImage2D_bd0466091ed50f83: function () {
      return handleError(function (
        arg0,
        arg1,
        arg2,
        arg3,
        arg4,
        arg5,
        arg6,
        arg7,
        arg8,
        arg9,
      ) {
        arg0.texImage2D(
          arg1 >>> 0,
          arg2,
          arg3,
          arg4,
          arg5,
          arg6,
          arg7 >>> 0,
          arg8 >>> 0,
          arg9,
        );
      }, arguments);
    },
    __wbg_texImage2D_f110542c571d15a4: function () {
      return handleError(function (
        arg0,
        arg1,
        arg2,
        arg3,
        arg4,
        arg5,
        arg6,
        arg7,
        arg8,
        arg9,
      ) {
        arg0.texImage2D(
          arg1 >>> 0,
          arg2,
          arg3,
          arg4,
          arg5,
          arg6,
          arg7 >>> 0,
          arg8 >>> 0,
          arg9,
        );
      }, arguments);
    },
    __wbg_texParameteri_83c7801427720baa: function (arg0, arg1, arg2, arg3) {
      arg0.texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
    },
    __wbg_texParameteri_bc24667dff936ebd: function (arg0, arg1, arg2, arg3) {
      arg0.texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
    },
    __wbg_uniform1f_e5a0491ecd710bbc: function (arg0, arg1, arg2) {
      arg0.uniform1f(arg1, arg2);
    },
    __wbg_uniform1f_f3284bea42055704: function (arg0, arg1, arg2) {
      arg0.uniform1f(arg1, arg2);
    },
    __wbg_uniform3fv_8aba848c825c4dcc: function (arg0, arg1, arg2, arg3) {
      arg0.uniform3fv(arg1, getArrayF32FromWasm0(arg2, arg3));
    },
    __wbg_uniform3fv_ff2fddc612532e5f: function (arg0, arg1, arg2, arg3) {
      arg0.uniform3fv(arg1, getArrayF32FromWasm0(arg2, arg3));
    },
    __wbg_uniformMatrix4fv_65df27ae81aac4a7: function (
      arg0,
      arg1,
      arg2,
      arg3,
      arg4,
    ) {
      arg0.uniformMatrix4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
    },
    __wbg_uniformMatrix4fv_ad33dd8ac90a1166: function (
      arg0,
      arg1,
      arg2,
      arg3,
      arg4,
    ) {
      arg0.uniformMatrix4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
    },
    __wbg_useProgram_6403314e6307ff8f: function (arg0, arg1) {
      arg0.useProgram(arg1);
    },
    __wbg_useProgram_b0607e62e147410b: function (arg0, arg1) {
      arg0.useProgram(arg1);
    },
    __wbg_vertexAttribPointer_89754c61239e5837: function (
      arg0,
      arg1,
      arg2,
      arg3,
      arg4,
      arg5,
      arg6,
    ) {
      arg0.vertexAttribPointer(
        arg1 >>> 0,
        arg2,
        arg3 >>> 0,
        arg4 !== 0,
        arg5,
        arg6,
      );
    },
    __wbg_vertexAttribPointer_dfec25e05e323ba4: function (
      arg0,
      arg1,
      arg2,
      arg3,
      arg4,
      arg5,
      arg6,
    ) {
      arg0.vertexAttribPointer(
        arg1 >>> 0,
        arg2,
        arg3 >>> 0,
        arg4 !== 0,
        arg5,
        arg6,
      );
    },
    __wbg_viewport_325ef6f6b074c24f: function (arg0, arg1, arg2, arg3, arg4) {
      arg0.viewport(arg1, arg2, arg3, arg4);
    },
    __wbg_viewport_b1858453ab05f289: function (arg0, arg1, arg2, arg3, arg4) {
      arg0.viewport(arg1, arg2, arg3, arg4);
    },
    __wbg_width_5adcb07d04d08bdf: function (arg0) {
      const ret = arg0.width;
      return ret;
    },
    __wbindgen_cast_0000000000000001: function (arg0) {
      // Cast intrinsic for `F64 -> Externref`.
      const ret = arg0;
      return ret;
    },
    __wbindgen_cast_0000000000000002: function (arg0, arg1) {
      // Cast intrinsic for `Ref(Slice(F32)) -> NamedExternref("Float32Array")`.
      const ret = getArrayF32FromWasm0(arg0, arg1);
      return ret;
    },
    __wbindgen_cast_0000000000000003: function (arg0, arg1) {
      // Cast intrinsic for `Ref(Slice(I16)) -> NamedExternref("Int16Array")`.
      const ret = getArrayI16FromWasm0(arg0, arg1);
      return ret;
    },
    __wbindgen_cast_0000000000000004: function (arg0, arg1) {
      // Cast intrinsic for `Ref(Slice(I32)) -> NamedExternref("Int32Array")`.
      const ret = getArrayI32FromWasm0(arg0, arg1);
      return ret;
    },
    __wbindgen_cast_0000000000000005: function (arg0, arg1) {
      // Cast intrinsic for `Ref(Slice(I8)) -> NamedExternref("Int8Array")`.
      const ret = getArrayI8FromWasm0(arg0, arg1);
      return ret;
    },
    __wbindgen_cast_0000000000000006: function (arg0, arg1) {
      // Cast intrinsic for `Ref(Slice(U16)) -> NamedExternref("Uint16Array")`.
      const ret = getArrayU16FromWasm0(arg0, arg1);
      return ret;
    },
    __wbindgen_cast_0000000000000007: function (arg0, arg1) {
      // Cast intrinsic for `Ref(Slice(U32)) -> NamedExternref("Uint32Array")`.
      const ret = getArrayU32FromWasm0(arg0, arg1);
      return ret;
    },
    __wbindgen_cast_0000000000000008: function (arg0, arg1) {
      // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
      const ret = getArrayU8FromWasm0(arg0, arg1);
      return ret;
    },
    __wbindgen_cast_0000000000000009: function (arg0, arg1) {
      // Cast intrinsic for `Ref(String) -> Externref`.
      const ret = getStringFromWasm0(arg0, arg1);
      return ret;
    },
    __wbindgen_init_externref_table: function () {
      const table = wasm.__wbindgen_externrefs;
      const offset = table.grow(4);
      table.set(0, undefined);
      table.set(offset + 0, undefined);
      table.set(offset + 1, null);
      table.set(offset + 2, true);
      table.set(offset + 3, false);
    },
  };
  return {
    __proto__: null,
    './inochi2d_bg.js': import0,
  };
}

const Inochi2dRuntimeFinalization =
  typeof FinalizationRegistry === 'undefined'
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) =>
        wasm.__wbg_inochi2druntime_free(ptr >>> 0, 1),
      );

function addToExternrefTable0(obj) {
  const idx = wasm.__externref_table_alloc();
  wasm.__wbindgen_externrefs.set(idx, obj);
  return idx;
}

function debugString(val) {
  // primitive types
  const type = typeof val;
  if (type == 'number' || type == 'boolean' || val == null) {
    return `${val}`;
  }
  if (type == 'string') {
    return `"${val}"`;
  }
  if (type == 'symbol') {
    const description = val.description;
    if (description == null) {
      return 'Symbol';
    } else {
      return `Symbol(${description})`;
    }
  }
  if (type == 'function') {
    const name = val.name;
    if (typeof name == 'string' && name.length > 0) {
      return `Function(${name})`;
    } else {
      return 'Function';
    }
  }
  // objects
  if (Array.isArray(val)) {
    const length = val.length;
    let debug = '[';
    if (length > 0) {
      debug += debugString(val[0]);
    }
    for (let i = 1; i < length; i++) {
      debug += ', ' + debugString(val[i]);
    }
    debug += ']';
    return debug;
  }
  // Test for built-in
  const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
  let className;
  if (builtInMatches && builtInMatches.length > 1) {
    className = builtInMatches[1];
  } else {
    // Failed to match the standard '[object ClassName]'
    return toString.call(val);
  }
  if (className == 'Object') {
    // we're a user defined class or Object
    // JSON.stringify avoids problems with cycles, and is generally much
    // easier than looping through ownProperties of `val`.
    try {
      return 'Object(' + JSON.stringify(val) + ')';
    } catch (_) {
      return 'Object';
    }
  }
  // errors
  if (val instanceof Error) {
    return `${val.name}: ${val.message}\n${val.stack}`;
  }
  // TODO we could test for more things here, like `Set`s and `Map`s.
  return className;
}

function getArrayF32FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayI16FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getInt16ArrayMemory0().subarray(ptr / 2, ptr / 2 + len);
}

function getArrayI32FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getInt32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayI8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getInt8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

function getArrayU16FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint16ArrayMemory0().subarray(ptr / 2, ptr / 2 + len);
}

function getArrayU32FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
  if (
    cachedDataViewMemory0 === null ||
    cachedDataViewMemory0.buffer.detached === true ||
    (cachedDataViewMemory0.buffer.detached === undefined &&
      cachedDataViewMemory0.buffer !== wasm.memory.buffer)
  ) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
  if (
    cachedFloat32ArrayMemory0 === null ||
    cachedFloat32ArrayMemory0.byteLength === 0
  ) {
    cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
  }
  return cachedFloat32ArrayMemory0;
}

let cachedInt16ArrayMemory0 = null;
function getInt16ArrayMemory0() {
  if (
    cachedInt16ArrayMemory0 === null ||
    cachedInt16ArrayMemory0.byteLength === 0
  ) {
    cachedInt16ArrayMemory0 = new Int16Array(wasm.memory.buffer);
  }
  return cachedInt16ArrayMemory0;
}

let cachedInt32ArrayMemory0 = null;
function getInt32ArrayMemory0() {
  if (
    cachedInt32ArrayMemory0 === null ||
    cachedInt32ArrayMemory0.byteLength === 0
  ) {
    cachedInt32ArrayMemory0 = new Int32Array(wasm.memory.buffer);
  }
  return cachedInt32ArrayMemory0;
}

let cachedInt8ArrayMemory0 = null;
function getInt8ArrayMemory0() {
  if (
    cachedInt8ArrayMemory0 === null ||
    cachedInt8ArrayMemory0.byteLength === 0
  ) {
    cachedInt8ArrayMemory0 = new Int8Array(wasm.memory.buffer);
  }
  return cachedInt8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return decodeText(ptr, len);
}

let cachedUint16ArrayMemory0 = null;
function getUint16ArrayMemory0() {
  if (
    cachedUint16ArrayMemory0 === null ||
    cachedUint16ArrayMemory0.byteLength === 0
  ) {
    cachedUint16ArrayMemory0 = new Uint16Array(wasm.memory.buffer);
  }
  return cachedUint16ArrayMemory0;
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
  if (
    cachedUint32ArrayMemory0 === null ||
    cachedUint32ArrayMemory0.byteLength === 0
  ) {
    cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
  }
  return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
  if (
    cachedUint8ArrayMemory0 === null ||
    cachedUint8ArrayMemory0.byteLength === 0
  ) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
  try {
    return f.apply(this, args);
  } catch (e) {
    const idx = addToExternrefTable0(e);
    wasm.__wbindgen_exn_store(idx);
  }
}

function isLikeNone(x) {
  return x === undefined || x === null;
}

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0()
      .subarray(ptr, ptr + buf.length)
      .set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
  }

  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;

  const mem = getUint8ArrayMemory0();

  let offset = 0;

  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 0x7f) break;
    mem[ptr + offset] = code;
  }
  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, (len = offset + arg.length * 3), 1) >>> 0;
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
    const ret = cachedTextEncoder.encodeInto(arg, view);

    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }

  WASM_VECTOR_LEN = offset;
  return ptr;
}

function takeFromExternrefTable0(idx) {
  const value = wasm.__wbindgen_externrefs.get(idx);
  wasm.__externref_table_dealloc(idx);
  return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', {
  ignoreBOM: true,
  fatal: true,
});
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
  numBytesDecoded += len;
  if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
    cachedTextDecoder = new TextDecoder('utf-8', {
      ignoreBOM: true,
      fatal: true,
    });
    cachedTextDecoder.decode();
    numBytesDecoded = len;
  }
  return cachedTextDecoder.decode(
    getUint8ArrayMemory0().subarray(ptr, ptr + len),
  );
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
  cachedTextEncoder.encodeInto = function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
      read: arg.length,
      written: buf.length,
    };
  };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
  wasm = instance.exports;
  wasmModule = module;
  cachedDataViewMemory0 = null;
  cachedFloat32ArrayMemory0 = null;
  cachedInt16ArrayMemory0 = null;
  cachedInt32ArrayMemory0 = null;
  cachedInt8ArrayMemory0 = null;
  cachedUint16ArrayMemory0 = null;
  cachedUint32ArrayMemory0 = null;
  cachedUint8ArrayMemory0 = null;
  wasm.__wbindgen_start();
  return wasm;
}

async function __wbg_load(module, imports) {
  if (typeof Response === 'function' && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        const validResponse = module.ok && expectedResponseType(module.type);

        if (
          validResponse &&
          module.headers.get('Content-Type') !== 'application/wasm'
        ) {
          console.warn(
            '`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n',
            e,
          );
        } else {
          throw e;
        }
      }
    }

    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);

    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }

  function expectedResponseType(type) {
    switch (type) {
      case 'basic':
      case 'cors':
      case 'default':
        return true;
    }
    return false;
  }
}

function initSync(module) {
  if (wasm !== undefined) return wasm;

  if (module !== undefined) {
    if (Object.getPrototypeOf(module) === Object.prototype) {
      ({ module } = module);
    } else {
      console.warn(
        'using deprecated parameters for `initSync()`; pass a single object instead',
      );
    }
  }

  const imports = __wbg_get_imports();
  if (!(module instanceof WebAssembly.Module)) {
    module = new WebAssembly.Module(module);
  }
  const instance = new WebAssembly.Instance(module, imports);
  return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
  if (wasm !== undefined) return wasm;

  if (module_or_path !== undefined) {
    if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
      ({ module_or_path } = module_or_path);
    } else {
      console.warn(
        'using deprecated parameters for the initialization function; pass a single object instead',
      );
    }
  }

  if (module_or_path === undefined) {
    module_or_path = new URL('inochi2d_bg.wasm', import.meta.url);
  }
  const imports = __wbg_get_imports();

  if (
    typeof module_or_path === 'string' ||
    (typeof Request === 'function' && module_or_path instanceof Request) ||
    (typeof URL === 'function' && module_or_path instanceof URL)
  ) {
    module_or_path = fetch(module_or_path);
  }

  const { instance, module } = await __wbg_load(await module_or_path, imports);

  return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
