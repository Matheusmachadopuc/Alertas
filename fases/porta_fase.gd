extends StaticBody2D

func _on_body_entered(body):
	if body.is_in_group("player"):
		print("Você venceu!")

		# Troca para tela de vitória
		get_tree().change_scene_to_file("res://vitoria.tscn")
		
