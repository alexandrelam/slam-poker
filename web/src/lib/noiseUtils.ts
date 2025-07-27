export class NoiseGenerator {
  private permutation: number[];

  constructor(seed?: number) {
    // Initialize permutation table for Perlin noise
    this.permutation = [];
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = i;
    }

    // Shuffle using seed if provided
    if (seed !== undefined) {
      this.seedRandom(seed);
    }

    // Shuffle the permutation array
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [this.permutation[i], this.permutation[j]] = [
        this.permutation[j],
        this.permutation[i],
      ];
    }

    // Duplicate the permutation array
    for (let i = 0; i < 256; i++) {
      this.permutation[256 + i] = this.permutation[i];
    }
  }

  private seedValue = 1;

  private seedRandom(seed: number) {
    this.seedValue = seed;
  }

  private random(): number {
    const x = Math.sin(this.seedValue++) * 10000;
    return x - Math.floor(x);
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return (1 - t) * a + t * b;
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  // 3D Perlin noise
  noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.permutation[X] + Y;
    const AA = this.permutation[A] + Z;
    const AB = this.permutation[A + 1] + Z;
    const B = this.permutation[X + 1] + Y;
    const BA = this.permutation[B] + Z;
    const BB = this.permutation[B + 1] + Z;

    return this.lerp(
      w,
      this.lerp(
        v,
        this.lerp(
          u,
          this.grad(this.permutation[AA], x, y, z),
          this.grad(this.permutation[BA], x - 1, y, z),
        ),
        this.lerp(
          u,
          this.grad(this.permutation[AB], x, y - 1, z),
          this.grad(this.permutation[BB], x - 1, y - 1, z),
        ),
      ),
      this.lerp(
        v,
        this.lerp(
          u,
          this.grad(this.permutation[AA + 1], x, y, z - 1),
          this.grad(this.permutation[BA + 1], x - 1, y, z - 1),
        ),
        this.lerp(
          u,
          this.grad(this.permutation[AB + 1], x, y - 1, z - 1),
          this.grad(this.permutation[BB + 1], x - 1, y - 1, z - 1),
        ),
      ),
    );
  }

  // 2D Perlin noise (simplified)
  noise2D(x: number, y: number): number {
    return this.noise(x, y, 0);
  }

  // Octave noise for more complex patterns
  octaveNoise(
    x: number,
    y: number,
    octaves: number,
    persistence: number,
    scale: number,
  ): number {
    let value = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return value / maxValue;
  }
}

export class FlowField {
  private noise: NoiseGenerator;
  private width: number;
  private height: number;
  private resolution: number;
  private vectors: { x: number; y: number }[][];

  constructor(
    width: number,
    height: number,
    resolution: number = 20,
    seed?: number,
  ) {
    this.noise = new NoiseGenerator(seed);
    this.width = width;
    this.height = height;
    this.resolution = resolution;
    this.vectors = [];
    this.generateField();
  }

  private generateField() {
    const cols = Math.ceil(this.width / this.resolution);
    const rows = Math.ceil(this.height / this.resolution);

    for (let x = 0; x < cols; x++) {
      this.vectors[x] = [];
      for (let y = 0; y < rows; y++) {
        // Use noise to determine flow direction
        const angle =
          this.noise.octaveNoise(x * 0.1, y * 0.1, 4, 0.5, 0.01) * Math.PI * 4;
        this.vectors[x][y] = {
          x: Math.cos(angle),
          y: Math.sin(angle),
        };
      }
    }
  }

  getVector(x: number, y: number): { x: number; y: number } {
    const col = Math.floor(x / this.resolution);
    const row = Math.floor(y / this.resolution);

    if (
      col >= 0 &&
      col < this.vectors.length &&
      row >= 0 &&
      row < this.vectors[0].length
    ) {
      return this.vectors[col][row];
    }

    return { x: 0, y: 0 };
  }

  updateField(time: number) {
    const cols = Math.ceil(this.width / this.resolution);
    const rows = Math.ceil(this.height / this.resolution);

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        // Animate the flow field over time
        const angle =
          this.noise.octaveNoise(x * 0.1, y * 0.1, 4, 0.5, 0.01) * Math.PI * 4 +
          time * 0.0005;
        this.vectors[x][y] = {
          x: Math.cos(angle),
          y: Math.sin(angle),
        };
      }
    }
  }
}

export interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private flowField: FlowField;
  private maxParticles: number;

  constructor(flowField: FlowField, maxParticles: number = 1000) {
    this.flowField = flowField;
    this.maxParticles = maxParticles;
    this.initParticles();
  }

  private initParticles() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    return {
      x: Math.random() * this.flowField["width"],
      y: Math.random() * this.flowField["height"],
      prevX: 0,
      prevY: 0,
      vx: 0,
      vy: 0,
      life: Math.random() * 100 + 50,
      maxLife: Math.random() * 100 + 50,
      color: this.getRandomColor(),
    };
  }

  private getRandomColor(): string {
    const colors = [
      "rgba(147, 51, 234, 0.6)", // purple
      "rgba(236, 72, 153, 0.6)", // pink
      "rgba(59, 130, 246, 0.6)", // blue
      "rgba(16, 185, 129, 0.6)", // emerald
      "rgba(245, 158, 11, 0.6)", // amber
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  update() {
    for (const particle of this.particles) {
      particle.prevX = particle.x;
      particle.prevY = particle.y;

      // Get flow field influence
      const force = this.flowField.getVector(particle.x, particle.y);

      // Apply force
      particle.vx += force.x * 0.1;
      particle.vy += force.y * 0.1;

      // Apply damping
      particle.vx *= 0.99;
      particle.vy *= 0.99;

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Update life
      particle.life--;

      // Reset particle if it dies or goes out of bounds
      if (
        particle.life <= 0 ||
        particle.x < 0 ||
        particle.x > this.flowField["width"] ||
        particle.y < 0 ||
        particle.y > this.flowField["height"]
      ) {
        Object.assign(particle, this.createParticle());
      }
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }
}
