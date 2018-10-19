function cameraName(label) {
  let clean = label.replace(/\s*\([0-9a-f]+(:[0-9a-f]+)?\)\s*$/, '');
  return clean || label || null;
}

class MediaError extends Error {
  constructor(type) {
    super(`Cannot access video stream (${type}).`);
    this.type = type;
  }
}

class Camera {
  constructor(id, name, facingMode) {
    this.id = id;
    this.name = name;
    this.facingMode = facingMode;
    this._stream = null;
  }

  // facingMode is needed for iOS devices
  // Options are 'environment' for back camera and 'user' for front camera
  async start() {
    let constraints = {
      audio: false,
      video: {
        facingMode: this.facingMode,
        mandatory: {
          sourceId: this.id,
          minWidth: 600,
          maxWidth: 800,
          minAspectRatio: 1.6
        },
        optional: []
      }
    };

    this._stream = await Camera._wrapErrors(async () => {
      return await navigator.mediaDevices.getUserMedia(constraints);
    });

    return this._stream;
  }

  stop() {
    if (!this._stream) {
      return;
    }

    for (let stream of this._stream.getVideoTracks()) {
      stream.stop();
    }

    this._stream = null;
  }

  static async getCameras(facingMode = 'environment') {
    await this._ensureAccess(facingMode);

    let devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(d => d.kind === 'videoinput')
      .map(d => new Camera(d.deviceId, cameraName(d.label), facingMode));
  }

  static async _ensureAccess(facingMode) {
    return await this._wrapErrors(async () => {
      let access = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } });
      for (let stream of access.getVideoTracks()) {
        stream.stop();
      }
    });
  }

  static async _wrapErrors(fn) {
    try {
      return await fn();
    } catch (e) {
      if (e.name) {
        throw new MediaError(e.name);
      } else {
        throw e;
      }
    }
  }
}

module.exports = Camera;
