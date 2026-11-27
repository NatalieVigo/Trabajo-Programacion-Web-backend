-- HU-7 Métricas y usuarios: listas de unidades y vínculos. HU-1 las lee en el registro (p06) y en Mi cuenta (p10).

CREATE TABLE unidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE vinculos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL UNIQUE
);
