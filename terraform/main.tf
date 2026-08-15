terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# =============================================================================
# 1. RED Y COMUNICACIONES (VPC, Subnets, Gateway) - FALTABA ESTO
# =============================================================================

resource "aws_vpc" "uce_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "uce-vpc-production" }
}

# Subnets Públicas (Balanceador y Bastion)
resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.uce_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true
  tags = { Name = "uce-public-subnet-1" }
}

resource "aws_subnet" "public_subnet_b" {
  vpc_id                  = aws_vpc.uce_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "us-east-1b"
  map_public_ip_on_launch = true
  tags = { Name = "uce-public-subnet-2" }
}

# Subnet Privada (Donde viven tus Microservicios protegidos)
resource "aws_subnet" "private_subnet" {
  vpc_id            = aws_vpc.uce_vpc.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "us-east-1a"
  tags = { Name = "uce-private-subnet" }
}

# Internet Gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.uce_vpc.id
}

# NAT Gateway (Vital para que el servidor privado tenga internet para instalar Docker)
resource "aws_eip" "nat_eip" {
  domain = "vpc"
}

resource "aws_nat_gateway" "nat_gw" {
  allocation_id = aws_eip.nat_eip.id
  subnet_id     = aws_subnet.public_subnet.id
  tags = { Name = "uce-nat-gateway" }
}

# Rutas
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.uce_vpc.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}

resource "aws_route_table_association" "pub_assoc_1" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_rt.id
}
resource "aws_route_table_association" "pub_assoc_2" {
  subnet_id      = aws_subnet.public_subnet_b.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table" "private_rt" {
  vpc_id = aws_vpc.uce_vpc.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_gw.id
  }
}

resource "aws_route_table_association" "priv_assoc" {
  subnet_id      = aws_subnet.private_subnet.id
  route_table_id = aws_route_table.private_rt.id
}

# =============================================================================
# 2. SEGURIDAD (Security Groups)
# =============================================================================

resource "aws_security_group" "bastion_sg" {
  name   = "uce-bastion-sg"
  vpc_id = aws_vpc.uce_vpc.id

  ingress {
    description = "SSH desde cualquier lugar (En prod restringir IP)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "alb_sg" {
  name   = "uce-alb-sg"
  vpc_id = aws_vpc.uce_vpc.id

  ingress {
    description = "HTTP Publico"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "app_sg" {
  name   = "uce-app-sg"
  vpc_id = aws_vpc.uce_vpc.id

  # SSH solo desde el Bastion (R-11 Jump Box)
  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion_sg.id]
  }

  # Tráfico HTTP desde el Balanceador (R-14 API Management entry point)
  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# =============================================================================
# 3. ALMACENAMIENTO S3 (Para Reportes R-20)
# =============================================================================
resource "random_id" "bucket_id" {
  byte_length = 4
}

resource "aws_s3_bucket" "reports_bucket" {
  bucket = "uce-academic-reports-${random_id.bucket_id.hex}"
  tags   = { Name = "Reportes Academicanos" }
}

# =============================================================================
# 4. COMPUTACIÓN (EC2)
# =============================================================================

resource "aws_instance" "bastion_host" {
  ami                    = "ami-0c7217cdde317cfec" # Ubuntu 22.04 LTS (us-east-1)
  instance_type          = "t2.micro"
  key_name               = "vockey"
  subnet_id              = aws_subnet.public_subnet.id
  vpc_security_group_ids = [aws_security_group.bastion_sg.id]
  tags                   = { Name = "uce-bastion-jumpbox" }
}

resource "aws_instance" "app_server" {
  ami                    = "ami-0c7217cdde317cfec"
  # 🚩 CAMBIO IMPORTANTE: t3.large (2CPU, 8GB) para soportar 12 micros + Kafka + DBs
  instance_type          = "t3.large" 
  key_name               = "vockey"
  subnet_id              = aws_subnet.private_subnet.id
  vpc_security_group_ids = [aws_security_group.app_sg.id]

  # Disco de 30GB para aguantar todas las imágenes Docker y DBs
  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  # Script de inicialización (User Data) - Automatización RNF-10
  user_data = <<-EOF
              #!/bin/bash
              # Actualizar sistema
              dnf update -y || apt-get update -y
              apt-get install -y git curl unzip make build-essential nginx

              # Instalar Docker & Compose (RNF-09 Contenedores)
              curl -fsSL https://get.docker.com -o get-docker.sh
              sh get-docker.sh
              usermod -aG docker ubuntu
              curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
              chmod +x /usr/local/bin/docker-compose

              # Instalar Node.js 20 (RNF-04 Stack Backend)
              curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
              apt-get install -y nodejs

              # Instalar Go 1.21 (RNF-05 Motor de Cálculo)
              wget https://go.dev/dl/go1.21.6.linux-amd64.tar.gz
              tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
              echo 'export PATH=$PATH:/usr/local/go/bin' >> /home/ubuntu/.bashrc
              
              # Instalar PM2 para gestión de procesos
              npm install -g pm2

              # Habilitar Nginx
              systemctl enable nginx
              systemctl start nginx
              EOF

  tags = { Name = "uce-app-server-production" }
}

# =============================================================================
# 5. BALANCEADOR (ALB) - (Cumple R-12 Escalabilidad/Acceso)
# =============================================================================

resource "aws_lb" "uce_alb" {
  name               = "uce-academic-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_subnet.id, aws_subnet.public_subnet_b.id]
  tags               = { Name = "uce-alb-principal" }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.uce_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.uce_tg.arn
  }
}

resource "aws_lb_target_group" "uce_tg" {
  name     = "uce-app-tg"
  port     = 80 # Nginx en el servidor escucha en el 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.uce_vpc.id

  health_check {
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

resource "aws_lb_target_group_attachment" "app_attach" {
  target_group_arn = aws_lb_target_group.uce_tg.arn
  target_id        = aws_instance.app_server.id
  port             = 80
}

# =============================================================================
# 6. OUTPUTS
# =============================================================================

output "alb_dns_name" {
  value       = aws_lb.uce_alb.dns_name
  description = "URL PUBLICA DEL SISTEMA"
}

output "bastion_ssh" {
  value       = "ssh -i labsuser.pem -A ubuntu@${aws_instance.bastion_host.public_ip}"
  description = "1. Conectar al Bastion"
}

output "internal_ssh" {
  value       = "ssh ubuntu@${aws_instance.app_server.private_ip}"
  description = "2. Desde el Bastion, saltar al App Server"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.reports_bucket.bucket
  description = "Bucket para reportes PDF"
}