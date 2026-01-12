resource "aws_security_group" "bastion_sg" {
  name        = "bastion-ssh-access"
  description = "Permitir SSH solo al Bastion"
  vpc_id      = aws_vpc.uce_vpc.id

  # Entrada: Solo SSH (Puerto 22)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # En producción, aquí pondríamos solo tu IP
  }

  # Salida: Permitir todo el tráfico saliente
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "uce-bastion-sg" }
}