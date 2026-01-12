# 1. Creación de la VPC
resource "aws_vpc" "uce_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "uce-vpc-distribuida" }
}

# 2. Subred Pública (Para el Bastion y el Load Balancer)
resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.uce_vpc.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "us-east-1a"
  tags = { Name = "uce-public-subnet" }
}

# 3. Subred Privada (Para los Microservicios NestJS y Go)
resource "aws_subnet" "private_subnet" {
  vpc_id            = aws_vpc.uce_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1a"
  tags = { Name = "uce-private-subnet" }
}

# 4. Internet Gateway (El puente a internet)
resource "aws_internet_gateway" "uce_igw" {
  vpc_id = aws_vpc.uce_vpc.id
  tags   = { Name = "uce-igw" }
}

# 5. Tabla de Rutas para la Subred Pública
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.uce_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.uce_igw.id
  }

  tags = { Name = "uce-public-rt" }
}

# 6. Asociación de la Tabla de Rutas con la Subred Pública
resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_rt.id
}

# Nueva subred pública en una zona diferente (1b)
resource "aws_subnet" "public_subnet_b" {
  vpc_id                  = aws_vpc.uce_vpc.id
  cidr_block              = "10.0.3.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "us-east-1b"
  tags = { Name = "uce-public-subnet-b" }
}

# Asociar la nueva subred a la tabla de rutas pública existente
resource "aws_route_table_association" "public_assoc_b" {
  subnet_id      = aws_subnet.public_subnet_b.id
  route_table_id = aws_route_table.public_rt.id
}