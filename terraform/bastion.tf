resource "aws_instance" "bastion_host" {
  ami           = "ami-0c7217cdde317cfec"
  instance_type = "t2.micro"
  key_name      = "vockey" # <--- AGREGA ESTA LÍNEA
  subnet_id     = aws_subnet.public_subnet.id
  vpc_security_group_ids = [aws_security_group.bastion_sg.id]
  tags = { Name = "uce-bastion-jumpbox" }
}